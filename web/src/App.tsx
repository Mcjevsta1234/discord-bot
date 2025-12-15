import { useEffect, useMemo, useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { Sidebar } from './components/Sidebar';
import { PreviewPane } from './components/PreviewPane';
import { ToolLog } from './components/ToolLog';

export type Message = { role: 'system' | 'user' | 'assistant'; content: string };
export type PlanStep = { step: string; model?: string; provider?: string; reason?: string };
export type Provider = {
  name: string;
  label: string;
  type: string;
  base_url?: string;
  models: { id: string; display: string }[];
  default_model: string;
};

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'System prompt governs behavior and tool usage.' },
  ]);
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('together');
  const [selectedModel, setSelectedModel] = useState<string>('togethercomputer/Apriel-1.6-15B-Thinker');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        const providerList: Provider[] = data.providers ?? [];
        setProviders(providerList);
        const primary = providerList.find((p) => p.name === 'together') ?? providerList[0];
        if (primary) {
          setSelectedProvider(primary.name);
          setSelectedModel(primary.default_model);
        }
      })
      .catch((error) => {
        console.error('failed to load providers', error);
      });
  }, []);

  const modelsForProvider = useMemo(() => {
    const provider = providers.find((p) => p.name === selectedProvider);
    return provider?.models ?? [];
  }, [providers, selectedProvider]);

  const handleSend = async (content: string) => {
    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: 'demo',
          provider: selectedProvider,
          model: selectedModel,
          messages: nextMessages,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'chat failed');
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setPlan(data.plan ?? []);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Request failed. Check server or agent runtime.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`app theme-${theme}`}>
      <Sidebar
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        providers={providers}
        selectedProvider={selectedProvider}
        onSelectProvider={setSelectedProvider}
        models={modelsForProvider}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />
      <main className="workspace">
        <section className="workspace__main">
          <header className="workspace__header">
            <div>
              <h1>Codex Platform</h1>
              <p>Chat, orchestrate tools, and preview code in one place.</p>
            </div>
            <div className="header__actions">
              <div className="select-row">
                <label>Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(event) => setSelectedProvider(event.target.value)}
                >
                  {providers.map((provider) => (
                    <option key={provider.name} value={provider.name}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="select-row">
                <label>Model</label>
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                >
                  {modelsForProvider.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>
          <div className="workspace__grid">
            <ChatPanel messages={messages} onSend={handleSend} pending={sending} />
            <PreviewPane />
            <ToolLog plan={plan} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
