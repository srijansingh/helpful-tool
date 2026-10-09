// Known festival dates for 2026. Hardcoded rather than computed: deriving
// festival dates requires a full luni-solar month calendar (month names,
// adhik/kshaya month rules, regional Amanta/Purnimanta conventions), which
// is out of scope for v1. Sourced from several 2026 Hindu calendar
// publishers; where they disagreed by a day (Janmashtami, Ganesh Chaturthi),
// the most commonly cited date was used. This list needs a manual update
// each year.
export const FESTIVALS_2026 = [
  { name: "Makar Sankranti", date: "2026-01-14" },
  { name: "Vasant Panchami", date: "2026-01-23" },
  { name: "Maha Shivaratri", date: "2026-02-15" },
  { name: "Holika Dahan (Chhoti Holi)", date: "2026-03-03" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Ugadi / Gudi Padwa", date: "2026-03-19" },
  { name: "Ram Navami", date: "2026-03-26" },
  { name: "Hanuman Jayanti", date: "2026-04-02" },
  { name: "Raksha Bandhan", date: "2026-08-28" },
  { name: "Janmashtami", date: "2026-09-04" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
  { name: "Sharad Navratri", date: "2026-10-11" },
  { name: "Durga Ashtami / Maha Navami", date: "2026-10-19" },
  { name: "Dussehra (Vijayadashami)", date: "2026-10-20" },
  { name: "Karva Chauth", date: "2026-10-29" },
  { name: "Dhanteras", date: "2026-11-06" },
  { name: "Choti Diwali (Naraka Chaturdashi)", date: "2026-11-07" },
  { name: "Diwali (Lakshmi Puja)", date: "2026-11-08" },
  { name: "Govardhan Puja", date: "2026-11-09" },
  { name: "Bhai Dooj", date: "2026-11-10" },
  { name: "Chhath Puja", date: "2026-11-15" },
];

export function nextFestival(fromDate = new Date()) {
  const todayStr = fromDate.toISOString().slice(0, 10);
  return FESTIVALS_2026.find((f) => f.date >= todayStr) || null;
}
