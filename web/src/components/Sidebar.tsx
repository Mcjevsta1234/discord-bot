import type { Provider } from '../App';

interface SidebarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  providers: Provider[];
  selectedProvider: string;
  onSelectProvider: (value: string) => void;
  models: { id: string; display: string }[];
  selectedModel: string;
  onSelectModel: (value: string) => void;
}

export function Sidebar({
  theme,
  onToggleTheme,
  providers,
  selectedProvider,
  onSelectProvider,
  models,
  selectedModel,
  onSelectModel,
}: SidebarProps) {
  const providerOptions = providers.length
    ? providers
    : [{ name: 'none', label: 'No providers configured', type: 'none', models: [], default_model: '' }];

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div>
          <p className="eyebrow brand">witchy world</p>
          <h2>Sessions</h2>
        </div>
        <button className="ghost" onClick={onToggleTheme}>
          Theme: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>
      <nav className="sidebar__nav">
        <div className="sidebar__group">
          <p className="eyebrow">Provider</p>
          <select
            className="sidebar__select"
            value={selectedProvider}
            onChange={(event) => onSelectProvider(event.target.value)}
            disabled={!providers.length}
          >
            {providerOptions.map((provider) => (
              <option key={provider.name} value={provider.name}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sidebar__group">
          <p className="eyebrow">Model</p>
          <select
            className="sidebar__select"
            value={selectedModel}
            onChange={(event) => onSelectModel(event.target.value)}
            disabled={!models.length}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.display}
              </option>
            ))}
          </select>
          <p className="muted">Switch between OpenAI, Together, DeepSeek, or self-hosted endpoints.</p>
        </div>
      </nav>
    </aside>
  );
}
