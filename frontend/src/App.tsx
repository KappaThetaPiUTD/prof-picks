import { useCallback, useEffect, useRef, useState } from 'react';
import ProfPicksChat from './ProfPicksChat';
import ScheduleBuilder from './ScheduleBuilder';
import { ChatHandle, ScheduleAction, Section } from './types';

const STORAGE_KEY = 'profpicks.schedule.v1';

function loadSchedule(): Section[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(s => s && typeof s.class_number === 'string') : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [schedule, setSchedule] = useState<Section[]>(loadSchedule);
  const [busy, setBusy] = useState(false);
  const chat = useRef<ChatHandle>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule)); } catch { /* storage unavailable */ }
  }, [schedule]);

  const addSection = useCallback((section: Section) => {
    setSchedule(s => (s.some(x => x.class_number === section.class_number) ? s : [...s, section]));
  }, []);

  const applyActions = useCallback((actions: ScheduleAction[]) => {
    setSchedule(current => actions.reduce((s, a) => {
      if (a.action === 'remove') return s.filter(x => x.class_number !== a.class_number);
      return s.some(x => x.class_number === a.section.class_number) ? s : [...s, a.section];
    }, current));
  }, []);

  return (
    <div className="app">
      <header className="app__bar">
        <span className="app__logo">Prof<span>Picks</span></span>
        <span className="app__tag">UT Dallas schedule planner</span>
      </header>
      <main className="app__main">
        <ScheduleBuilder
          schedule={schedule}
          busy={busy}
          onRemove={cn => setSchedule(s => s.filter(x => x.class_number !== cn))}
          onClear={() => setSchedule([])}
          onBuild={prompt => chat.current?.send(prompt)}
        />
      </main>
      <aside className="app__side">
        <ProfPicksChat
          ref={chat}
          schedule={schedule}
          onAddSection={addSection}
          onScheduleActions={applyActions}
          onBusyChange={setBusy}
        />
      </aside>
    </div>
  );
}
