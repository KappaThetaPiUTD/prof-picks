import { FormEvent, useMemo, useState } from 'react';
import { courseColor, DAYS, formatClock, overlaps, Section, sectionTimes } from './types';
import './ScheduleBuilder.css';

type Props = {
  schedule: Section[];
  busy: boolean;
  onRemove: (classNumber: string) => void;
  onClear: () => void;
  onBuild: (prompt: string) => void;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const START_OPTIONS = ['Any', '8:00am', '9:00am', '10:00am', '11:00am', '12:00pm', '1:00pm'];
const END_OPTIONS = ['Any', '2:00pm', '3:00pm', '4:00pm', '5:00pm', '6:00pm', '7:00pm', '9:00pm'];
const PRIORITIES = {
  balanced: 'Balanced',
  easier: 'Easier grading',
  experienced: 'Most experienced',
} as const;
const HOUR_PX = 54;
const COURSE_RE = /^([A-Za-z]{2,4})\s*-?\s*(\d{4})$/;


export default function ScheduleBuilder({ schedule, busy, onRemove, onClear, onBuild }: Props) {
  const [courses, setCourses] = useState<string[]>([]);
  const [courseDraft, setCourseDraft] = useState('');
  const [courseError, setCourseError] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [earliest, setEarliest] = useState('Any');
  const [latest, setLatest] = useState('Any');
  const [priority, setPriority] = useState<keyof typeof PRIORITIES>('balanced');
  const [copied, setCopied] = useState(false);

  const term = schedule.find(s => s.term)?.term ?? 'Upcoming term';

  /** Parse typed course codes into the chip list; returns the new list, or null if invalid. */
  function addCourse(raw: string): string[] | null {
    const parts = raw.split(/[,;]+/).map(p => p.trim()).filter(Boolean);
    const next = [...courses];
    for (const part of parts) {
      const m = COURSE_RE.exec(part);
      if (!m) { setCourseError(`"${part}" isn't a course code like CS 3345`); return null; }
      const code = `${m[1].toUpperCase()} ${m[2]}`;
      if (!next.includes(code) && next.length < 7) next.push(code);
    }
    setCourses(next);
    setCourseDraft('');
    setCourseError('');
    return next;
  }

  function onCourseSubmit(e: FormEvent) {
    e.preventDefault();
    if (courseDraft.trim()) addCourse(courseDraft);
  }

  function build() {
    let pending = courses;
    if (courseDraft.trim()) {
      const next = addCourse(courseDraft);
      if (!next) return;
      pending = next;
    }
    if (!pending.length) { setCourseError('Add at least one course'); return; }
    const prefs: string[] = [];
    if (days.length) prefs.push(`only ${days.join('/')} classes`);
    if (earliest !== 'Any') prefs.push(`nothing starting before ${earliest}`);
    if (latest !== 'Any') prefs.push(`nothing ending after ${latest}`);
    if (priority === 'easier') prefs.push('prefer professors with easier grading (higher average GPA)');
    if (priority === 'experienced') prefs.push('prefer professors who have taught the course for more semesters');
    const replace = schedule.some(s => pending.includes(s.course))
      ? ' Replace any sections of these courses already in my schedule.' : '';
    onBuild(`Build my schedule with ${pending.join(', ')}.${prefs.length ? ` Preferences: ${prefs.join('; ')}.` : ''}${replace}`);
  }

  const { conflicts, conflictPairs } = useMemo(() => {
    const set = new Set<string>();
    let pairs = 0;
    schedule.forEach((a, i) => schedule.slice(i + 1).forEach(b => {
      if (overlaps(a, b)) { set.add(a.class_number); set.add(b.class_number); pairs += 1; }
    }));
    return { conflicts: set, conflictPairs: pairs };
  }, [schedule]);

  const timed = schedule.filter(s => sectionTimes(s));
  const untimed = schedule.filter(s => !sectionTimes(s));
  const showSat = timed.some(s => s.meeting_days.includes('Saturday'));
  const gridDays = DAYS.slice(0, showSat ? 6 : 5);
  const startHour = Math.min(8, ...timed.map(s => Math.floor(sectionTimes(s)!.start / 60)));
  const endHour = Math.max(18, ...timed.map(s => Math.ceil(sectionTimes(s)!.end / 60)));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  /** Lay out blocks per day; overlapping blocks share the column side by side. */
  function blocksFor(day: string) {
    const items = timed
      .filter(s => s.meeting_days.includes(day))
      .map(s => ({ s, ...sectionTimes(s)! }))
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const out: Array<{ s: Section; start: number; end: number; lane: number; lanes: number }> = [];
    let cluster: typeof out = [];
    let clusterEnd = -1;
    const flush = () => {
      const lanes = Math.max(1, ...cluster.map(c => c.lane + 1));
      cluster.forEach(c => out.push({ ...c, lanes }));
      cluster = [];
    };
    for (const it of items) {
      if (it.start >= clusterEnd) { flush(); clusterEnd = -1; }
      const laneEnds: number[] = [];
      cluster.forEach(c => { laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? -1, c.end); });
      let lane = laneEnds.findIndex(e => e <= it.start);
      if (lane === -1) lane = laneEnds.length;
      cluster.push({ ...it, lane, lanes: 1 });
      clusterEnd = Math.max(clusterEnd, it.end);
    }
    flush();
    return out;
  }

  async function copyClassNumbers() {
    const text = schedule.map(s => `${s.section}  #${s.class_number}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked; numbers are visible in the table */ }
  }

  const earliestMin = timed.length ? Math.min(...timed.map(s => sectionTimes(s)!.start)) : null;
  const campusDays = new Set(timed.flatMap(s => s.meeting_days)).size;

  return (
    <section className="sb" aria-label="Schedule builder">
      <div className="sb__top">
        <div>
          <p className="sb__eyebrow">Mock schedule · {term}</p>
          <h1 className="sb__title">Your week</h1>
        </div>
        <dl className="sb__stats">
          <div><dt>Courses</dt><dd>{schedule.length}</dd></div>
          <div><dt>Days on campus</dt><dd>{campusDays}</dd></div>
          <div><dt>Earliest class</dt><dd>{earliestMin === null ? '—' : formatClock(earliestMin)}</dd></div>
          <div className={conflictPairs ? 'sb__stat--warn' : ''}><dt>Conflicts</dt><dd>{conflictPairs}</dd></div>
        </dl>
      </div>

      <div className="sb__prefs">
        <div className="sb__prefs-head">
          <h2>Plan with ProfPicks</h2>
          <p>Tell us what you need and the assistant picks sections from Nebula with no time conflicts.</p>
        </div>
        <div className="sb__prefs-grid">
          <div className="sb__field sb__field--courses">
            <label htmlFor="sb-course">Courses</label>
            <form onSubmit={onCourseSubmit} className="sb__course-input">
              {courses.map(c => (
                <span className="sb__chip" key={c}>
                  {c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => setCourses(courses.filter(x => x !== c))}>×</button>
                </span>
              ))}
              <input id="sb-course" value={courseDraft} placeholder={courses.length ? 'Add another…' : 'e.g. CS 3345, MATH 2418'}
                onChange={e => { setCourseDraft(e.target.value); setCourseError(''); }}
                onBlur={() => courseDraft.trim() && addCourse(courseDraft)} />
            </form>
            {courseError && <small className="sb__error">{courseError}</small>}
          </div>
          <div className="sb__field sb__field--days">
            <span className="sb__label">Days</span>
            <div className="sb__days" role="group" aria-label="Preferred days">
              {WEEKDAYS.map(d => (
                <button type="button" key={d} aria-pressed={days.includes(d)}
                  onClick={() => setDays(days.includes(d) ? days.filter(x => x !== d) : WEEKDAYS.filter(x => x === d || days.includes(x)))}>{d}</button>
              ))}
            </div>
            <small>{days.length ? 'Only these days' : 'Any day'}</small>
          </div>
          <div className="sb__field">
            <label htmlFor="sb-earliest">Start no earlier than</label>
            <select id="sb-earliest" value={earliest} onChange={e => setEarliest(e.target.value)}>
              {START_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="sb__field">
            <label htmlFor="sb-latest">End by</label>
            <select id="sb-latest" value={latest} onChange={e => setLatest(e.target.value)}>
              {END_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="sb__field">
            <label htmlFor="sb-priority">Professor priority</label>
            <select id="sb-priority" value={priority} onChange={e => setPriority(e.target.value as keyof typeof PRIORITIES)}>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="sb__field sb__field--action">
            <button type="button" className="sb__build" disabled={busy} onClick={build}>
              {busy ? 'Building…' : 'Build my schedule'}
            </button>
          </div>
        </div>
      </div>

      <div className="sb__calendar" style={{ ['--hour' as string]: `${HOUR_PX}px` }}>
        <div className="sb__cal-head" style={{ gridTemplateColumns: `52px repeat(${gridDays.length}, 1fr)` }}>
          <span />
          {gridDays.map(d => <span key={d}>{d.slice(0, 3)}</span>)}
        </div>
        <div className="sb__cal-body" style={{ gridTemplateColumns: `52px repeat(${gridDays.length}, 1fr)`, height: hours.length * HOUR_PX }}>
          <div className="sb__hours">
            {hours.map(h => <span key={h} style={{ top: (h - startHour) * HOUR_PX }}>{formatClock(h * 60)}</span>)}
          </div>
          {gridDays.map(day => (
            <div className="sb__day" key={day}>
              {hours.map(h => <div key={h} className="sb__slot" style={{ top: (h - startHour) * HOUR_PX }} />)}
              {blocksFor(day).map(({ s, start, end, lane, lanes }) => (
                <div key={s.class_number}
                  className={`sb__block sb__c${courseColor(s.course, schedule)}${conflicts.has(s.class_number) ? ' sb__block--conflict' : ''}`}
                  style={{
                    top: ((start - startHour * 60) / 60) * HOUR_PX,
                    height: ((end - start) / 60) * HOUR_PX - 2,
                    left: `calc(${(lane / lanes) * 100}% + 3px)`,
                    width: `calc(${100 / lanes}% - 6px)`,
                  }}
                  title={`${s.section} · ${s.professors.join(', ')} · ${s.time} · ${s.location ?? ''}`}>
                  <strong>{s.course}</strong>
                  <span>{s.time?.replace('–', ' – ')}</span>
                  <span className="sb__block-meta">{s.professors[0]}{s.location ? ` · ${s.location}` : ''}</span>
                </div>
              ))}
            </div>
          ))}
          {!schedule.length && (
            <div className="sb__empty">
              <strong>No classes yet</strong>
              <span>Add courses above and press “Build my schedule”, or ask the assistant for a section.</span>
            </div>
          )}
        </div>
        {!!untimed.length && (
          <div className="sb__untimed">
            <span>No set meeting time:</span>
            {untimed.map(s => <span key={s.class_number} className={`sb__pill sb__c${courseColor(s.course, schedule)}`}>{s.section} · {s.mode ?? 'Online/TBA'}</span>)}
          </div>
        )}
      </div>

      {!!schedule.length && (
        <div className="sb__list">
          <div className="sb__list-head">
            <h2>Sections</h2>
            <div>
              <button type="button" className="sb__ghost" onClick={copyClassNumbers}>{copied ? 'Copied ✓' : 'Copy class numbers'}</button>
              <button type="button" className="sb__ghost" onClick={onClear}>Clear all</button>
            </div>
          </div>
          <div className="sb__table-wrap">
            <table className="sb__table">
              <thead>
                <tr><th>Course</th><th>Class #</th><th>Professor</th><th>When</th><th>Where</th><th>Avg GPA</th><th><span className="sr-only">Remove</span></th></tr>
              </thead>
              <tbody>
                {schedule.map(s => (
                  <tr key={s.class_number} className={conflicts.has(s.class_number) ? 'sb__row--conflict' : ''}>
                    <td><span className={`sb__dot sb__c${courseColor(s.course, schedule)}`} />{s.section}</td>
                    <td className="sb__mono">{s.class_number}</td>
                    <td>{s.professors.join(', ')}</td>
                    <td>{s.days} {s.time}{conflicts.has(s.class_number) && <em className="sb__conflict-tag">conflict</em>}</td>
                    <td>{s.location ?? s.mode ?? '—'}</td>
                    <td>{s.avg_gpa != null ? s.avg_gpa.toFixed(2) : '—'}{s.pct_A != null && <small> · {Math.round(s.pct_A)}% A</small>}</td>
                    <td><button type="button" className="sb__remove" aria-label={`Remove ${s.section}`} onClick={() => onRemove(s.class_number)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sb__note">This is a planning mock-up. Check open seats on Coursebook, then register with these class numbers in Orion.</p>
        </div>
      )}
    </section>
  );
}
