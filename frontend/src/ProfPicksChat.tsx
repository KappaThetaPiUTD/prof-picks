import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import './ProfPicksChat.css';

export type ActiveSchedule = {
  name: string;
  term: string;
  sections: Array<{ course_code: string; section_number: string; meeting_times: string }>;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string; error?: boolean; sources?: string[] };

const suggested = [
  'What can you tell me about MATH 2415?',
  'Find the sections for CS 1337',
  'Compare historical grades for PHYS 2325',
];

/** Drop this component into the left panel of the existing Figma Make React App.
 * To add schedule awareness, pass activeSchedule from the planner's state.
 */
export default function ProfPicksChat({ activeSchedule }: { activeSchedule?: ActiveSchedule }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  async function send(message: string) {
    const clean = message.trim();
    if (!clean || sending) return;
    const previous = messages;
    setMessages([...previous, { role: 'user', content: clean }]);
    setDraft('');
    setSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: previous.filter(m => !m.error).slice(-12).map(({ role, content }) => ({ role, content })),
          active_schedule: activeSchedule ?? null,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(typeof err.detail === 'string' ? err.detail : `HTTP ${response.status}`);
      }
      const result: { reply: string; sources: string[] } = await response.json();
      setMessages(m => [...m, { role: 'assistant', content: result.reply, sources: result.sources }]);
    } catch (error) {
      setMessages(m => [...m, {
        role: 'assistant', error: true,
        content: `The chat service could not respond. ${error instanceof Error ? error.message : 'Try again.'}`,
      }]);
    } finally {
      setSending(false);
    }
  }

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
    <section className="pp-chat" aria-label="ProfPicks academic assistant">
      <header className="pp-chat__header">
        <div className="pp-chat__mark" aria-hidden="true">✦</div>
        <div><h2>ProfPicks Chat</h2><p>UTD course and grade data</p></div>
        <span className="pp-chat__readonly">Read-only V1</span>
      </header>
      <div className="pp-chat__conversation" aria-live="polite" aria-relevant="additions text">
        <div className="pp-chat__welcome">
          <div className="pp-chat__sun" aria-hidden="true">☄️</div>
          <h3>Hey, Comet!</h3>
          <p>Ask about UTD courses, sections, or historical grades. I’ll check Nebula instead of guessing. Claude-powered conversations can be enabled later.</p>
          {activeSchedule && <p className="pp-chat__schedule">Planning: {activeSchedule.name} · {activeSchedule.term}</p>}
          {messages.length === 0 && <div className="pp-chat__suggestions">
            {suggested.map(prompt => <button type="button" key={prompt} disabled={sending} onClick={() => void send(prompt)}>{prompt} ↗</button>)}
          </div>}
        </div>
        {messages.map((msg, index) => <div key={index} className={`pp-chat__bubble pp-chat__bubble--${msg.role}${msg.error ? ' pp-chat__bubble--error' : ''}`}>
          <div className="pp-chat__speaker">{msg.role === 'assistant' ? 'ProfPicks' : 'You'}</div>
          <div className="pp-chat__text">{msg.content}</div>
          {!!msg.sources?.length && <div className="pp-chat__sources">Source: {msg.sources.join(' · ')}</div>}
        </div>)}
        {sending && <div className="pp-chat__thinking" role="status">Checking UTD data and preparing a response…</div>}
        <div ref={end} />
      </div>
      <form className="pp-chat__composer" onSubmit={onSubmit}>
        <label htmlFor="pp-chat-message" className="pp-chat__label">Your question</label>
        <textarea id="pp-chat-message" rows={2} maxLength={2000} placeholder="Ask about courses or professors…" value={draft} onKeyDown={onKeyDown} onChange={e => setDraft(e.target.value)} disabled={sending} />
        <div className="pp-chat__controls"><small>Grades are historical, not professor ratings.</small><button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Working…' : 'Send ↑'}</button></div>
      </form>
    </section>
  );
}
