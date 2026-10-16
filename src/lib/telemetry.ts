import { get, set } from "idb-keyval";

// On-device usage signal for Finding #11 ("no way to tell what's actually
// hurting customers") — never leaves the device unless the person
// explicitly exports it from Settings. No network call anywhere in this
// file; that's the whole point. Event shape is deliberately thin: a tool
// id, a type, a timestamp, and (for feedback) a value — never a filename,
// an error message, or anything else that could identify a document.
export type TelemetryEventType = "opened" | "completed" | "error" | "feedback";

export interface TelemetryEvent {
  id: string;
  tool: string;
  type: TelemetryEventType;
  value?: "easy" | "hard";
  timestamp: number;
}

const EVENTS_KEY = "pdf-toolkit:telemetry-events";
const ENABLED_KEY = "pdf-toolkit:telemetry-enabled";
const MAX_EVENTS = 2000;

export function isTelemetryEnabled(): boolean {
  try {
    const v = localStorage.getItem(ENABLED_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setTelemetryEnabled(on: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  } catch {
    // Private browsing / blocked storage — the toggle just won't persist.
  }
}

let cache: TelemetryEvent[] | null = null;
// Serializes writes so two recordTelemetryEvent calls in quick succession
// (e.g. a completion firing right after an "opened") don't race on the
// same idb-keyval read-modify-write and drop one of them.
let queue = Promise.resolve();

async function load(): Promise<TelemetryEvent[]> {
  if (cache) return cache;
  cache = (await get<TelemetryEvent[]>(EVENTS_KEY).catch(() => undefined)) ?? [];
  return cache;
}

export function recordTelemetryEvent(
  tool: string,
  type: TelemetryEventType,
  value?: "easy" | "hard",
) {
  if (!isTelemetryEnabled()) return;
  queue = queue.then(async () => {
    const events = await load();
    const next = [
      ...events,
      { id: crypto.randomUUID(), tool, type, value, timestamp: Date.now() },
    ].slice(-MAX_EVENTS);
    cache = next;
    await set(EVENTS_KEY, next).catch(() => {
      // Best-effort — in-memory cache still reflects the event even if
      // IndexedDB is unavailable.
    });
  });
}

export async function getTelemetryEvents(): Promise<TelemetryEvent[]> {
  return [...(await load())];
}

export async function clearTelemetryEvents() {
  cache = [];
  await set(EVENTS_KEY, []).catch(() => {});
}

export interface ToolTelemetrySummary {
  tool: string;
  opened: number;
  completed: number;
  errors: number;
  completionRate: number | null;
  errorRate: number | null;
  feedbackEasy: number;
  feedbackHard: number;
}

export interface TelemetrySummary {
  totalEvents: number;
  since: number | null;
  perTool: ToolTelemetrySummary[];
  // First "opened" anywhere to first "completed" anywhere — an
  // approximation of time-to-first-success for a new visitor, not a
  // per-session funnel (that would need per-step instrumentation this
  // pass doesn't add).
  timeToFirstSuccessMs: number | null;
}

export function summarizeTelemetry(events: TelemetryEvent[]): TelemetrySummary {
  const byTool = new Map<string, ToolTelemetrySummary>();
  const ensure = (tool: string) => {
    let s = byTool.get(tool);
    if (!s) {
      s = {
        tool,
        opened: 0,
        completed: 0,
        errors: 0,
        completionRate: null,
        errorRate: null,
        feedbackEasy: 0,
        feedbackHard: 0,
      };
      byTool.set(tool, s);
    }
    return s;
  };
  let firstOpened: number | null = null;
  let firstCompleted: number | null = null;
  for (const e of events) {
    const s = ensure(e.tool);
    if (e.type === "opened") {
      s.opened++;
      if (firstOpened === null || e.timestamp < firstOpened) firstOpened = e.timestamp;
    } else if (e.type === "completed") {
      s.completed++;
      if (firstCompleted === null || e.timestamp < firstCompleted) firstCompleted = e.timestamp;
    } else if (e.type === "error") {
      s.errors++;
    } else if (e.type === "feedback") {
      if (e.value === "easy") s.feedbackEasy++;
      else if (e.value === "hard") s.feedbackHard++;
    }
  }
  for (const s of byTool.values()) {
    s.completionRate = s.opened > 0 ? s.completed / s.opened : null;
    s.errorRate = s.opened > 0 ? s.errors / s.opened : null;
  }
  return {
    totalEvents: events.length,
    since: events.length ? Math.min(...events.map((e) => e.timestamp)) : null,
    perTool: [...byTool.values()].sort((a, b) => b.opened - a.opened),
    timeToFirstSuccessMs:
      firstOpened !== null && firstCompleted !== null && firstCompleted >= firstOpened
        ? firstCompleted - firstOpened
        : null,
  };
}

// Throttles the post-completion "was that easy?" prompt to at most once
// per tool per day — the goal is a usable signal, not a nag on every
// single merge in a session.
const ASKED_PREFIX = "pdf-toolkit:feedback-asked:";
const ASK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function shouldAskFeedback(tool: string): boolean {
  try {
    const last = Number(localStorage.getItem(ASKED_PREFIX + tool) || 0);
    return Date.now() - last > ASK_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markFeedbackAsked(tool: string) {
  try {
    localStorage.setItem(ASKED_PREFIX + tool, String(Date.now()));
  } catch {
    // Private browsing / blocked storage — worst case, asked again next time.
  }
}
