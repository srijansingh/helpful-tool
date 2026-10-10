import { useState } from "react";

const COLLAPSED_KEY = "pdf-toolkit:sidebar-collapsed";
const GROUPS_KEY = "pdf-toolkit:sidebar-open-groups";

function readCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored !== null) return stored === "1";
  } catch {
    // Private browsing / blocked storage — fall through to the viewport
    // default below.
  }
  // No explicit preference yet: default to the collapsed rail at tablet
  // widths (768–1023px), where a full 264px sidebar crowds the workspace,
  // and expanded elsewhere. The user can always override either way.
  if (typeof window !== "undefined") {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }
  return false;
}

function readOpenGroups(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(GROUPS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Private browsing / blocked storage / corrupt value — fall back to
    // every group open, which is the safe default (nothing hidden).
  }
  return {};
}

// Sidebar collapse state and per-group disclosure state, both persisted —
// a user who collapses the rail or closes a category they don't use
// shouldn't have to redo it every visit.
export function useSidebarState() {
  const [collapsed, setCollapsedState] = useState(readCollapsed);
  const [openGroups, setOpenGroupsState] = useState(readOpenGroups);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
    } catch {
      // Best-effort only.
    }
  };

  const toggleGroup = (name: string) => {
    setOpenGroupsState((prev) => {
      const next = { ...prev, [name]: prev[name] === false ? true : false };
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {
        // Best-effort only.
      }
      return next;
    });
  };

  const isGroupOpen = (name: string) => openGroups[name] !== false;

  return { collapsed, setCollapsed, isGroupOpen, toggleGroup };
}
