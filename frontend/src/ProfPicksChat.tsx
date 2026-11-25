import { FormEvent, forwardRef, KeyboardEvent, useEffect, useImperativeHandle, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatHandle, courseColor, overlaps, ScheduleAction, Section } from './types';
import './ProfPicksChat.css';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
  sources?: string[];
  sections?: Section[];
  changes?: string;
};

type Props = {
  schedule: Section[];
  onAddSection: (section: Section) => void;
  onScheduleActions: (actions: ScheduleAction[]) => void;
  onBusyChange?: (busy: boolean) => void;
};

const suggested = [
  'Build a Tue/Thu schedule with CS 3345 and MATH 2418',
  "Which CS 1337 professor gives the most A's?",
  'CS 3345 with Satpute, Tue/Thu around 1pm',
];

function describeChanges(actions: ScheduleAction[]): string | undefined {
  const added = actions.filter(a => a.action === 'add').length;
  const removed = actions.filter(a => a.action === 'remove').length;
  const parts = [];
  if (added) parts.push(`added ${added} section${added > 1 ? 's' : ''}`);
  if (removed) parts.push(`removed ${removed}`);
  return parts.length ? `Schedule updated: ${parts.join(', ')}` : undefined;
}

const ProfPicksChat = forwardRef<ChatHandle, Props>(function ProfPicksChat(
  { schedule, onAddSection, onScheduleActions, onBusyChange }, ref,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const sendingRef = useRef(false);
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending]);
  useEffect(() => { onBusyChange?.(sending); }, [sending, onBusyChange]);

  async function send(message: string) {
    const clean = message.trim();
    if (!clean || sendingRef.current) return;
    sendingRef.current = true;
    const previous = messagesRef.current;
    setMessages([...previous, { role: 'user', content: clean }]);
    setDraft('');
    setSending(true);
    const current = scheduleRef.current;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: previous.filter(m => !m.error).slice(-12).map(({ role, content }) => ({ role, content })),
          active_schedule: {
            name: 'My schedule',
            term: current.find(s => s.term)?.term ?? 'Upcoming term',
            sections: current.slice(0, 16).map(s => ({
              course_code: s.course,
              section_number: s.section_number,
              meeting_times: `${s.days ?? ''} ${s.time ?? ''}`.trim(),
              class_number: s.class_number,
              professor: s.professors.join(', ').slice(0, 120),
              meeting_days: s.meeting_days,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          },
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(typeof err.detail === 'string' ? err.detail : `HTTP ${response.status}`);
      }
      const result: { reply: string; sources: string[]; sections?: Section[]; schedule_actions?: ScheduleAction[] } = await response.json();
      const actions = result.schedule_actions ?? [];
      if (actions.length) onScheduleActions(actions);
      setMessages(m => [...m, {
        role: 'assistant', content: result.reply, sources: result.sources,
        sections: result.sections ?? [], changes: describeChanges(actions),
      }]);
    } catch (error) {
      setMessages(m => [...m, {
        role: 'assistant', error: true,
        content: `The chat service could not respond. ${error instanceof Error ? error.message : 'Try again.'}`,
      }]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  useImperativeHandle(ref, () => ({ send: (m: string) => void send(m) }));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  return (
    <section className="pp-chat" aria-label="ProfPicks assistant">
      <header className="pp-chat__header">
        <div className="pp-chat__mark" aria-hidden="true">✦</div>
        <div><h2>ProfPicks Assistant</h2><p>Professors, grades &amp; sections from Nebula</p></div>
      </header>
      <div className="pp-chat__conversation" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && (
          <div className="pp-chat__welcome">
            <h3>Hey, Comet! ☄️</h3>
            <p>Ask about professors and grades, or have me build your schedule. Sections I suggest can go straight onto your calendar.</p>
            <div className="pp-chat__suggestions">
              {suggested.map(prompt => <button type="button" key={prompt} disabled={sending} onClick={() => void send(prompt)}>{prompt}</button>)}
            </div>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`pp-chat__bubble pp-chat__bubble--${msg.role}${msg.error ? ' pp-chat__bubble--error' : ''}`}>
            {msg.changes && <div className="pp-chat__changes">✓ {msg.changes}</div>}
            {msg.role === 'assistant' && !msg.error
              ? <div className="pp-chat__text pp-chat__md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
              : <div className="pp-chat__text">{msg.content}</div>}
            {!!msg.sections?.length && (
              <ul className="pp-chat__cards">
                {msg.sections.map(s => {
                  const added = schedule.some(x => x.class_number === s.class_number);
                  const clash = !added && schedule.find(x => overlaps(x, s));
                  return (
                    <li key={s.class_number} className={`pp-card sb__c${courseColor(s.course, schedule)}`}>
                      <div className="pp-card__main">
                        <strong>{s.section} <span>#{s.class_number}</span></strong>
                        <span>{s.professors.join(', ')} · {s.days} {s.time}</span>
                        {clash && <span className="pp-card__warn">Overlaps {clash.section}</span>}
                      </div>
                      <button type="button" disabled={added} onClick={() => onAddSection(s)}>{added ? 'Added ✓' : 'Add'}</button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!!msg.sources?.length && <div className="pp-chat__sources">Source: {msg.sources.join(' · ')}</div>}
          </div>
        ))}
        {sending && <div className="pp-chat__thinking" role="status"><span className="pp-chat__dots" aria-hidden="true"><i /><i /><i /></span>Checking Nebula…</div>}
        <div ref={end} />
      </div>
      <form className="pp-chat__composer" onSubmit={onSubmit}>
        <label htmlFor="pp-chat-message" className="sr-only">Your question</label>
        <textarea id="pp-chat-message" rows={2} maxLength={2000} placeholder="Ask about courses, professors, or your schedule…" value={draft} onKeyDown={onKeyDown} onChange={e => setDraft(e.target.value)} disabled={sending} />
        <button type="submit" disabled={sending || !draft.trim()} aria-label="Send">↑</button>
      </form>
    </section>
  );
});

export default ProfPicksChat;
