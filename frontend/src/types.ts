/** A course section as returned by the backend (find_sections → section_card). */
export type Section = {
  course: string;            // "CS 3345"
  section_number: string;    // "002"
  section: string;           // "CS 3345.002"
  class_number: string;      // "25101" — what students enter in Orion
  term: string | null;       // "Spring 2027"
  professors: string[];
  meeting_days: string[];    // ["Tuesday", "Thursday"]
  start_time: string;        // "1:00pm"
  end_time: string;          // "2:15pm"
  days: string | null;       // "Tue/Thu"
  time: string | null;       // "1:00pm–2:15pm"
  location: string | null;
  mode: string | null;
  avg_gpa: number | null;
  pct_A: number | null;
};

export type ScheduleAction =
  | { action: 'add'; section: Section }
  | { action: 'remove'; class_number: string };

export type ChatHandle = {
  send: (message: string) => void;
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** "1:00pm" → minutes after midnight, or null. */
export function parseClock(value: string | null | undefined): number | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?\s*$/i.exec(value ?? '');
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  const ampm = (m[3] ?? '').toLowerCase();
  if (ampm === 'p' && hour < 12) hour += 12;
  if (ampm === 'a' && hour === 12) hour = 0;
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function sectionTimes(s: Section): { start: number; end: number } | null {
  const start = parseClock(s.start_time);
  const end = parseClock(s.end_time);
  return start !== null && end !== null && end > start && s.meeting_days.length ? { start, end } : null;
}

export function overlaps(a: Section, b: Section): boolean {
  if (a.class_number === b.class_number) return false;
  const ta = sectionTimes(a);
  const tb = sectionTimes(b);
  if (!ta || !tb) return false;
  return a.meeting_days.some(d => b.meeting_days.includes(d)) && ta.start < tb.end && tb.start < ta.end;
}

/** Color slot per course: distinct for courses in the schedule (by order added), hashed otherwise. */
export function courseColor(course: string, schedule: Section[] = []): number {
  const order = [...new Set(schedule.map(s => s.course))];
  const i = order.indexOf(course);
  if (i !== -1) return i % 8;
  let h = 0;
  for (const ch of course) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (order.length + (h % 3)) % 8;
}

/** 690 → "11:30am", 780 → "1pm" */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`;
}
