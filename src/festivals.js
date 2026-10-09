// Known festival dates for the current season. Hardcoded rather than
// computed: deriving festival dates requires a full luni-solar month
// calendar (month names, adhik/kshaya month rules), which is out of scope
// for v1. This list needs a manual update each year.
export const FESTIVALS_2026 = [
  { name: "Dhanteras", date: "2026-11-06" },
  { name: "Choti Diwali (Naraka Chaturdashi)", date: "2026-11-07" },
  { name: "Diwali (Lakshmi Puja)", date: "2026-11-08" },
  { name: "Govardhan Puja", date: "2026-11-09" },
  { name: "Bhai Dooj", date: "2026-11-10" },
];

export function nextFestival(fromDate = new Date()) {
  const todayStr = fromDate.toISOString().slice(0, 10);
  return FESTIVALS_2026.find((f) => f.date >= todayStr) || null;
}
