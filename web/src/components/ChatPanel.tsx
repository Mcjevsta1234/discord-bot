import { FormEvent, useState } from 'react';
import type { Message } from '../App';

interface ChatPanelProps {
  messages: Message[];
  onSend: (content: string) => Promise<void>;
  pending: boolean;
}

export function ChatPanel({ messages, onSend, pending }: ChatPanelProps) {
  const [input, setInput] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    await onSend(input.trim());
    setInput('');
  };

  return (
    <section className="panel chat">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Session</p>
          <h2>Alpha Thread</h2>
        </div>
        <button className="ghost">Manage Prompt</button>
      </header>
      <div className="chat__messages">
        {messages.map((message, idx) => (
          <article key={idx} className={`message message--${message.role}`}>
            <p className="message__role">{message.role}</p>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      <form className="chat__input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Message the agent…"
          disabled={pending}
        />
        <button type="submit" className="primary" disabled={pending}>
          {pending ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
