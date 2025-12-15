import { useEffect, useState } from 'react';
import type { Provider, Routing } from '../App';

interface RoutingConfigProps {
  providers: Provider[];
  routing: Routing | null;
  onUpdate: (routing: Routing) => void;
}

export function RoutingConfig({ providers, routing, onUpdate }: RoutingConfigProps) {
  const [local, setLocal] = useState<Routing | null>(routing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(routing);
  }, [routing]);

  const handleChange = (key: keyof Routing, value: string) => {
    setLocal((prev) => ({ ...(prev || {}), [key]: value } as Routing));
  };

  const handleSave = async () => {
    if (!local) return;
    setSaving(true);
    try {
      const response = await fetch('/api/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'failed to save routing');
      onUpdate(data.routing);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const providerOptions = providers.map((provider) => (
    <option key={provider.name} value={provider.name}>
      {provider.label}
    </option>
  ));

  return (
    <section className="panel routing">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Routing</p>
          <h2>Model strategy</h2>
        </div>
        <button className="ghost" onClick={handleSave} disabled={saving || !local}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>
      {!local ? (
        <p className="muted">Loading routing preferences…</p>
      ) : (
        <div className="routing__grid">
          <label className="select-row">
            <span>Default</span>
            <select
              value={local.default_provider}
              onChange={(event) => handleChange('default_provider', event.target.value)}
            >
              {providerOptions}
            </select>
          </label>
          <label className="select-row">
            <span>Heavy (code/crawling)</span>
            <select
              value={local.heavy_provider}
              onChange={(event) => handleChange('heavy_provider', event.target.value)}
            >
              {providerOptions}
            </select>
          </label>
          <label className="select-row">
            <span>Search & planning</span>
            <select
              value={local.search_provider}
              onChange={(event) => handleChange('search_provider', event.target.value)}
            >
              {providerOptions}
            </select>
          </label>
          <label className="select-row">
            <span>Local/offline</span>
            <select
              value={local.local_provider || ''}
              onChange={(event) => handleChange('local_provider', event.target.value)}
            >
              <option value="">-- select --</option>
              {providerOptions}
            </select>
          </label>
        </div>
      )}
    </section>
  );
}
