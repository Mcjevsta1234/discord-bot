import { FormEvent, useState } from 'react';
import { Provider } from '../App';

type Props = {
  onAdded(providerList: Provider[]): void;
};

export function ProviderManager({ onAdded }: Props) {
  const [form, setForm] = useState({
    name: '',
    label: '',
    base_url: '',
    api_key: '',
    default_model: '',
    modelsRaw: '',
    type: 'openai-compatible',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const models = form.modelsRaw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((entry) => {
          const [id, display] = entry.split('|');
          return { id: id?.trim() ?? '', display: (display ?? id)?.trim() ?? id };
        });

      const payload = {
        name: form.name.trim(),
        label: form.label.trim() || form.name,
        base_url: form.base_url.trim(),
        api_key: form.api_key.trim() || undefined,
        default_model: form.default_model.trim(),
        models,
        type: form.type,
      };

      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'failed to add provider');
      }
      onAdded(data.providers ?? []);
      setForm({
        name: '',
        label: '',
        base_url: '',
        api_key: '',
        default_model: '',
        modelsRaw: '',
        type: 'openai-compatible',
      });
    } catch (err: any) {
      setError(err?.message || 'unable to add provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="provider-manager">
      <h3>Add provider</h3>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Name (unique key)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Label"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          required
        />
        <input
          placeholder="Base URL"
          value={form.base_url}
          onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          required
        />
        <input
          placeholder="API Key (optional if public)"
          value={form.api_key}
          onChange={(e) => setForm({ ...form, api_key: e.target.value })}
        />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="openai-compatible">OpenAI compatible</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="gemini">Gemini</option>
        </select>
        <input
          placeholder="Default model"
          value={form.default_model}
          onChange={(e) => setForm({ ...form, default_model: e.target.value })}
          required
        />
        <input
          placeholder="Models (id|label,id|label)"
          value={form.modelsRaw}
          onChange={(e) => setForm({ ...form, modelsRaw: e.target.value })}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Add provider'}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </div>
  );
}
