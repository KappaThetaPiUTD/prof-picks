import { FormEvent, PointerEvent as ReactPointerEvent, useMemo, useState } from "react";

type IconName =
  | "search"
  | "sliders"
  | "chevron"
  | "calendar"
  | "sparkles"
  | "send"
  | "grip"
  | "clock"
  | "user"
  | "chart"
  | "more"
  | "close"
  | "lock"
  | "account"
  | "history"
  | "bookmark"
  | "logout";

const iconPaths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  chevron: <path d="m8 10 4 4 4-4" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  sparkles: <><path d="m12 3 1.1 3.1L16 7.5l-2.9 1.4L12 12l-1.1-3.1L8 7.5l2.9-1.4L12 3Z" /><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM5.5 12l.8 2.2 2.2.8-2.2.8L5.5 18l-.8-2.2-2.2-.8 2.2-.8L5.5 12Z" /></>,
  send: <><path d="m21 3-7.4 18-3.4-7.2L3 10.4 21 3Z" /><path d="m10.2 13.8 4.5-4.5" /></>,
  grip: <><circle cx="9" cy="7" r=".7" fill="currentColor" /><circle cx="15" cy="7" r=".7" fill="currentColor" /><circle cx="9" cy="12" r=".7" fill="currentColor" /><circle cx="15" cy="12" r=".7" fill="currentColor" /><circle cx="9" cy="17" r=".7" fill="currentColor" /><circle cx="15" cy="17" r=".7" fill="currentColor" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  close: <><path d="m7 7 10 10M17 7 7 17" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  account: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6" /></>,
  history: <><path d="M4.9 7.5A8 8 0 1 1 4 14M4 5v5h5" /><path d="M12 8v5l3 2" /></>,
  bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></>,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

type Course = {
  id: string;
  code: string;
  title: string;
  section: string;
  professor: string;
  initials: string;
  days: string[];
  time: string;
  start: number;
  duration: number;
  grade: number;
  reviews: number;
  tone: "navy" | "brown" | "sand" | "sage";
};

const courses: Course[] = [
  { id: "cs3345-001", code: "CS 3345", title: "Data Structures & Algorithms", section: "001", professor: "Dr. Kevin Smith", initials: "KS", days: ["Mon", "Wed"], time: "10:00 – 11:15 AM", start: 10, duration: 1.25, grade: 3.72, reviews: 148, tone: "navy" },
  { id: "cs3345-003", code: "CS 3345", title: "Data Structures & Algorithms", section: "003", professor: "Prof. Elaine Lin", initials: "EL", days: ["Tue", "Thu"], time: "1:00 – 2:15 PM", start: 13, duration: 1.25, grade: 3.61, reviews: 212, tone: "brown" },
  { id: "cs3377-002", code: "CS 3377", title: "Systems Programming in UNIX", section: "002", professor: "Dr. Jason Brown", initials: "JB", days: ["Mon", "Wed"], time: "2:30 – 3:45 PM", start: 14.5, duration: 1.25, grade: 3.48, reviews: 96, tone: "sand" },
  { id: "cs4337-001", code: "CS 4337", title: "Programming Language Paradigms", section: "001", professor: "Dr. Mina Patel", initials: "MP", days: ["Tue", "Thu"], time: "9:00 – 10:15 AM", start: 9, duration: 1.25, grade: 3.43, reviews: 174, tone: "sage" },
];

const initialSchedule: Course[] = [
  { id: "math2418", code: "MATH 2418", title: "Linear Algebra", section: "004", professor: "Dr. Nora Wang", initials: "NW", days: ["Mon", "Wed"], time: "11:30 – 12:45 PM", start: 11.5, duration: 1.25, grade: 3.6, reviews: 83, tone: "brown" },
  { id: "phys2325", code: "PHYS 2325", title: "Mechanics", section: "002", professor: "Prof. Cole", initials: "PC", days: ["Tue", "Thu"], time: "10:30 – 11:45 AM", start: 10.5, duration: 1.25, grade: 3.5, reviews: 101, tone: "sage" },
  { id: "cs2305", code: "CS 2305", title: "Discrete Mathematics", section: "005", professor: "Dr. Avery", initials: "DA", days: ["Mon", "Wed"], time: "1:00 – 2:15 PM", start: 13, duration: 1.25, grade: 3.55, reviews: 118, tone: "navy" },
];

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const dayLabels = ["MON 19", "TUE 20", "WED 21", "THU 22", "FRI 23"];
const hourLabels = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];

function getLetterGrade(grade: number) {
  if (grade >= 3.67) return "A";
  if (grade >= 3.33) return "B+";
  if (grade >= 3) return "B";
  if (grade >= 2.67) return "B−";
  if (grade >= 2.33) return "C+";
  if (grade >= 2) return "C";
  if (grade >= 1.67) return "C−";
  if (grade >= 1) return "D";
  return "F";
}

function CourseCard({ course }: { course: Course }) {
  return (
    <article
      className="course-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/course-id", course.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <div className="course-card-top">
        <div>
          <div className="course-code">{course.code} <span>· Section {course.section}</span></div>
          <h3>{course.title}</h3>
        </div>
        <span className="drag-handle" title="Drag to schedule"><Icon name="grip" size={17} /></span>
      </div>
      <div className="professor-row">
        <span className={`avatar ${course.tone}`}>{course.initials}</span>
        <div><strong>{course.professor}</strong><span>{course.reviews} professor reviews</span></div>
      </div>
      <div className="course-meta">
        <span><Icon name="calendar" size={14} /> {course.days.join(" / ")}</span>
        <span><Icon name="clock" size={14} /> {course.time}</span>
      </div>
      <div className="grade-row">
        <span><Icon name="chart" size={15} /> Final grade average</span>
        <strong>{course.grade.toFixed(2)} <small>/ 4.0</small></strong>
      </div>
      <div className="letter-grade-row">
        <span>Average final letter grade</span>
        <strong>{getLetterGrade(course.grade)}</strong>
      </div>
      <p className="data-source">Grade data via UTD Trends</p>
    </article>
  );
}

function SearchPanel({ onAdd, collapsed, onToggle }: { onAdd: (course: Course) => void; collapsed: boolean; onToggle: () => void }) {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [sort, setSort] = useState("grade");

  const results = useMemo(() => {
    const normalized = query.toLowerCase();
    const filtered = courses.filter((course) =>
      (!normalized || `${course.code} ${course.title} ${course.professor}`.toLowerCase().includes(normalized)) &&
      (!selectedDays.length || course.days.some((day) => selectedDays.includes(day)))
    );
    return [...filtered].sort((a, b) => {
      if (sort === "reviews") return b.reviews - a.reviews;
      if (sort === "alpha") return a.code.localeCompare(b.code);
      return b.grade - a.grade;
    });
  }, [query, selectedDays, sort]);

  if (collapsed) {
    return (
      <aside className="panel search-panel collapsed">
        <div className="brand-mark">N</div>
        <button className="expand-search" onClick={onToggle} aria-label="Expand class search" title="Expand class search">
          <Icon name="chevron" size={18} />
        </button>
        <Icon name="search" size={18} />
        <span className="collapsed-search-label">Class search</span>
      </aside>
    );
  }

  return (
    <aside className="panel search-panel">
      <header className="brand-header">
        <div className="brand-mark">N</div>
        <div><strong>Nexus</strong><span>Academic planner</span></div>
        <button className="collapse-search" onClick={onToggle} aria-label="Collapse class search" title="Collapse class search">
          <Icon name="chevron" size={18} />
        </button>
      </header>
      <div className="search-content">
        <div className="section-heading">
          <div><p className="eyebrow">Course catalog</p><h1>Find your classes</h1></div>
          <span className="term-pill">Fall ’25</span>
        </div>
        <label className="search-box">
          <Icon name="search" size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses or professors" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="filter-toolbar">
          <button className={filtersOpen ? "filter-button active" : "filter-button"} onClick={() => setFiltersOpen(!filtersOpen)}>
            <Icon name="sliders" size={16} /> Filters
            {!!selectedDays.length && <span className="filter-count">{selectedDays.length}</span>}
          </button>
          <label className="sort-select">
            <span>Sort:</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="grade">Highest grade</option>
              <option value="reviews">Most reviewed</option>
              <option value="alpha">Alphabetical</option>
              <option value="custom">Custom order</option>
            </select>
            <Icon name="chevron" size={14} />
          </label>
        </div>
        {filtersOpen && (
          <div className="filter-box">
            <div className="filter-label"><span>Meeting days</span><button onClick={() => setSelectedDays([])}>Clear</button></div>
            <div className="day-chips">
              {dayNames.map((day) => (
                <button key={day} className={selectedDays.includes(day) ? "selected" : ""} onClick={() => setSelectedDays(selectedDays.includes(day) ? selectedDays.filter((item) => item !== day) : [...selectedDays, day])}>{day}</button>
              ))}
            </div>
            <div className="time-filter">
              <label><span>Earliest</span><select><option>8:00 AM</option><option>9:00 AM</option><option>10:00 AM</option></select></label>
              <span className="time-dash" />
              <label><span>Latest</span><select><option>6:00 PM</option><option>5:00 PM</option><option>4:00 PM</option></select></label>
            </div>
          </div>
        )}
        <div className="results-label"><span>{results.length} sections found</span><span>Drag a class to your schedule</span></div>
        <div className="results-list">
          {results.map((course) => <div key={course.id} onDoubleClick={() => onAdd(course)}><CourseCard course={course} /></div>)}
          {!results.length && <div className="empty-results"><Icon name="search" size={24} /><strong>No matching classes</strong><span>Try clearing a filter or changing your search.</span></div>}
        </div>
      </div>
    </aside>
  );
}

function SchedulePanel({ schedule, onDropCourse, onRemove }: { schedule: Course[]; onDropCourse: (id: string, day?: string, start?: number) => void; onRemove: (id: string) => void }) {
  const credits = schedule.length * 3;
  return (
    <main className="panel schedule-panel">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">My schedule</p>
          <h2>Fall 2025</h2>
        </div>
        <div className="schedule-actions">
          <div className="schedule-stats">
            <span><strong>{schedule.length}</strong> classes</span>
            <span><strong>{credits}</strong> credits</span>
            <button><Icon name="more" size={19} /></button>
          </div>
          <AuthControl />
        </div>
      </header>
      <div className="schedule-body">
        <div className="calendar-note"><Icon name="sparkles" size={15} /><span>Drop classes anywhere on the calendar to add them</span></div>
        <div className="calendar-wrap">
          <div className="calendar-head">
            <div className="timezone">GMT−5</div>
            {dayLabels.map((label, index) => {
              const [day, date] = label.split(" ");
              return <div className={index === 2 ? "today" : ""} key={label}><span>{day}</span><strong>{date}</strong></div>;
            })}
          </div>
          <div
            className="calendar-grid"
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("application/course-id");
              const rect = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - rect.left - 58;
              const y = event.clientY - rect.top;
              const dayIndex = Math.max(0, Math.min(4, Math.floor(x / ((rect.width - 58) / 5))));
              const start = 8 + Math.max(0, Math.min(9, y / (rect.height / 10)));
              onDropCourse(id, dayNames[dayIndex], Math.round(start * 2) / 2);
            }}
          >
            <div className="time-column">{hourLabels.map((hour) => <span key={hour}>{hour}</span>)}</div>
            <div className="grid-lines">{hourLabels.map((hour) => <span key={hour} />)}</div>
            <div className="day-lines">{dayNames.map((day) => <span key={day} />)}</div>
            {schedule.flatMap((course) => course.days.map((day, dayIndex) => {
              const column = dayNames.indexOf(day);
              if (column < 0) return null;
              const top = ((course.start - 8) / 10) * 100;
              const height = (course.duration / 10) * 100;
              return (
                <button
                  className={`schedule-event ${course.tone}`}
                  key={`${course.id}-${day}`}
                  style={{ left: `calc(58px + (100% - 58px) / 5 * ${column} + 4px)`, width: "calc((100% - 58px) / 5 - 8px)", top: `${top}%`, height: `${height}%` }}
                  onClick={() => onRemove(course.id)}
                  title={`Remove ${course.code}`}
                >
                  <strong>{course.code}</strong>
                  <span>{dayIndex === 0 ? course.title : course.time.split(" – ")[0]}</span>
                </button>
              );
            }))}
          </div>
        </div>
        <div className="schedule-footer"><span><i className="status-dot" /> No schedule conflicts</span><span>Click a class block to remove it</span></div>
      </div>
    </main>
  );
}

type Message = { role: "assistant" | "user"; text: string };

function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 360, height: 560 });
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi, I’m your schedule copilot. I can help compare professors, spot conflicts, or build a balanced week." },
  ]);
  const [input, setInput] = useState("");

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!input.trim()) return;
    const question = input.trim();
    setMessages((current) => [...current, { role: "user", text: question }, { role: "assistant", text: "Based on your current plan, I’d prioritize CS 3345 with Dr. Smith. It has the strongest grade average and fits your Monday/Wednesday schedule without conflicts." }]);
    setInput("");
  };

  const openChat = () => {
    const width = Math.max(200, Math.min(size.width, 1000, window.innerWidth - 24));
    const height = Math.max(200, Math.min(size.height, 1500, window.innerHeight - 24));
    setSize({ width, height });
    setPosition({
      x: Math.max(12, window.innerWidth - width - 12),
      y: Math.max(12, window.innerHeight - height - 12),
    });
    setOpen(true);
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = position;
    const move = (moveEvent: PointerEvent) => {
      const maxX = Math.max(0, window.innerWidth - panel.offsetWidth);
      const maxY = Math.max(0, window.innerHeight - panel.offsetHeight);
      setPosition({
        x: Math.max(0, Math.min(maxX, startPosition.x + moveEvent.clientX - startX)),
        y: Math.max(0, Math.min(maxY, startPosition.y + moveEvent.clientY - startY)),
      });
    };
    const stop = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  };

  const startCornerResize = (corner: "nw" | "ne" | "sw" | "se", event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = position;
    const startSize = size;
    const rightEdge = startPosition.x + startSize.width;
    const bottomEdge = startPosition.y + startSize.height;

    const move = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let width = startSize.width;
      let height = startSize.height;
      let x = startPosition.x;
      let y = startPosition.y;

      if (corner.includes("e")) {
        width = Math.max(200, Math.min(1000, window.innerWidth - startPosition.x, startSize.width + deltaX));
      } else {
        width = Math.max(200, Math.min(1000, rightEdge, startSize.width - deltaX));
        x = rightEdge - width;
      }

      if (corner.includes("s")) {
        height = Math.max(200, Math.min(1500, window.innerHeight - startPosition.y, startSize.height + deltaY));
      } else {
        height = Math.max(200, Math.min(1500, bottomEdge, startSize.height - deltaY));
        y = bottomEdge - height;
      }

      setSize({ width, height });
      setPosition({ x, y });
    };

    const stop = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  };

  if (!open) {
    return (
      <button className="chat-launcher" onClick={openChat} aria-label="Open Nexus Assistant" title="Open Nexus Assistant">
        <Icon name="sparkles" size={24} />
        <span className="launcher-status" />
      </button>
    );
  }

  return (
    <aside
      className="chat-panel floating"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      {(["nw", "ne", "sw", "se"] as const).map((corner) => (
        <div
          className={`corner-resizer ${corner}`}
          key={corner}
          onPointerDown={(event) => startCornerResize(corner, event)}
          role="separator"
          aria-label={`Resize chatbot from ${corner} corner`}
        />
      ))}
      <header className="chat-header drag-header" onPointerDown={startDrag}>
        <div className="ai-avatar"><Icon name="sparkles" size={18} /></div>
        <div><strong>Nexus Assistant</strong><span><i /> Online · Drag to move</span></div>
        <button className="close-chat" onClick={() => setOpen(false)} aria-label="Close chatbot" title="Close chatbot">
          <Icon name="close" size={19} />
        </button>
      </header>
      <div className="chat-content">
        <div className="chat-date"><span>Today</span></div>
        <div className="messages">
          {messages.map((message, index) => (
            <div className={`message-row ${message.role}`} key={index}>
              {message.role === "assistant" && <span className="mini-ai"><Icon name="sparkles" size={13} /></span>}
              <div className="bubble">{message.text}</div>
            </div>
          ))}
        </div>
        {messages.length === 1 && (
          <div className="suggestions">
            <p>Try asking</p>
            <button onClick={() => setInput("Which CS 3345 section should I take?")}>Which CS 3345 section should I take?</button>
            <button onClick={() => setInput("Can you make my Fridays free?")}>Can you make my Fridays free?</button>
            <button onClick={() => setInput("Do I have any schedule conflicts?")}>Do I have any schedule conflicts?</button>
          </div>
        )}
      </div>
      <form className="composer" onSubmit={send}>
        <div className="composer-box">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Ask about your schedule..." rows={2} />
          <button type="submit" disabled={!input.trim()} aria-label="Send message"><Icon name="send" size={17} /></button>
        </div>
        <span>AI can make mistakes. Verify important details.</span>
      </form>
    </aside>
  );
}

function AuthControl() {
  const [modalOpen, setModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [activePlaceholder, setActivePlaceholder] = useState("");

  const submitAuth = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggedIn(true);
    setModalOpen(false);
    setCreateMode(false);
  };

  const accountItems: { label: string; icon: IconName; description: string }[] = [
    { label: "Account", icon: "account", description: "Account information will appear here." },
    { label: "History", icon: "history", description: "Your recent planning history will appear here." },
    { label: "Saved schedules", icon: "bookmark", description: "Your saved schedules will appear here." },
  ];

  return (
    <>
      <div className="auth-control">
        {!loggedIn ? (
          <button className="sign-in-button" onClick={() => setModalOpen(true)}>
            <Icon name="lock" size={15} />
            Sign in
          </button>
        ) : (
          <div className="account-menu-wrap">
            <button className="account-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
              <span className="account-avatar">{(username.trim()[0] || "U").toUpperCase()}</span>
              <span>My account</span>
              <Icon name="chevron" size={14} />
            </button>
            {menuOpen && (
              <div className="account-dropdown">
                <div className="account-summary">
                  <span className="account-avatar large">{(username.trim()[0] || "U").toUpperCase()}</span>
                  <div><strong>{username.trim() || "Nexus student"}</strong><span>Student account</span></div>
                </div>
                <nav>
                  {accountItems.map((item) => (
                    <button key={item.label} onClick={() => setActivePlaceholder(activePlaceholder === item.label ? "" : item.label)}>
                      <span className="menu-icon"><Icon name={item.icon} size={16} /></span>
                      <span>{item.label}</span>
                      <small>Coming soon</small>
                    </button>
                  ))}
                </nav>
                {activePlaceholder && (
                  <div className="account-placeholder">
                    <strong>{activePlaceholder}</strong>
                    <span>{accountItems.find((item) => item.label === activePlaceholder)?.description}</span>
                  </div>
                )}
                <button className="logout-button" onClick={() => { setLoggedIn(false); setMenuOpen(false); setActivePlaceholder(""); }}>
                  <Icon name="logout" size={16} /> Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="auth-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="auth-close" onClick={() => setModalOpen(false)} aria-label="Close sign in"><Icon name="close" size={18} /></button>
            <div className="auth-mark"><Icon name={createMode ? "account" : "lock"} size={20} /></div>
            <p className="eyebrow">{createMode ? "Join Nexus" : "Welcome back"}</p>
            <h2 id="auth-title">{createMode ? "Create your account" : "Sign in to Nexus"}</h2>
            <p className="auth-intro">{createMode ? "Save schedules and keep your planning history in one place." : "Access your saved schedules and continue planning."}</p>
            <form onSubmit={submitAuth}>
              <label>
                <span>Username or email</span>
                <div className="auth-input"><Icon name="account" size={16} /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="you@utdallas.edu" required autoFocus /></div>
              </label>
              <label>
                <span>Password</span>
                <div className="auth-input"><Icon name="lock" size={16} /><input type="password" placeholder="Enter your password" required minLength={4} /></div>
              </label>
              <button className="auth-submit" type="submit">{createMode ? "Create account" : "Sign in"}</button>
            </form>
            <div className="create-account">
              <span>{createMode ? "Already have an account?" : "New to Nexus?"}</span>
              <button onClick={() => setCreateMode(!createMode)}>{createMode ? "Sign in instead" : "Create an account"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [leftWidth, setLeftWidth] = useState(390);
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const [schedule, setSchedule] = useState<Course[]>(initialSchedule);

  const startResize = (event: ReactPointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = leftWidth;
    const move = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setLeftWidth(Math.max(315, Math.min(500, startWidth + delta)));
    };
    const stop = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  };

  const addCourse = (id: string, day?: string, start?: number) => {
    const course = courses.find((item) => item.id === id);
    if (!course || schedule.some((item) => item.id === id)) return;
    setSchedule([...schedule, day && start ? { ...course, days: [day], start } : course]);
  };

  return (
    <div className="app-shell" style={{ "--left-width": searchCollapsed ? "58px" : `${leftWidth}px` } as React.CSSProperties}>
      <SearchPanel onAdd={(course) => addCourse(course.id)} collapsed={searchCollapsed} onToggle={() => setSearchCollapsed(!searchCollapsed)} />
      <div className={`resize-handle ${searchCollapsed ? "disabled" : ""}`} onPointerDown={(event) => !searchCollapsed && startResize(event)}><span /></div>
      <SchedulePanel schedule={schedule} onDropCourse={addCourse} onRemove={(id) => setSchedule(schedule.filter((course) => course.id !== id))} />
      <ChatPanel />
    </div>
  );
}
