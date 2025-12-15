import { useState } from 'react';

export function PreviewPane() {
  const [mode, setMode] = useState<'html' | 'url'>('html');
  const [html, setHtml] = useState('<h1>Live preview</h1><p>Drop HTML to render here.</p>');
  const [url, setUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startPreview = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, content: html, url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'preview failed');
      setPreviewUrl(data.previewUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel preview">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Live Preview</p>
          <h2>Embedded Web View</h2>
        </div>
        <div className="preview__actions">
          <select value={mode} onChange={(event) => setMode(event.target.value as 'html' | 'url')}>
            <option value="html">HTML snippet</option>
            <option value="url">Existing server URL</option>
          </select>
          <button className="ghost" onClick={startPreview} disabled={saving}>
            {saving ? 'Saving…' : 'Start'}
          </button>
          {previewUrl && (
            <a className="ghost" href={previewUrl} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          )}
        </div>
      </header>
      <div className="preview__frame">
        {previewUrl ? (
          <iframe title="preview" src={previewUrl} />
        ) : (
          <div className="preview__placeholder">
            <p>Preview server not running</p>
            <small>Start a local preview to see your app live with hot reload.</small>
          </div>
        )}
      </div>
      <div className="preview__editor">
        {mode === 'html' ? (
          <textarea value={html} onChange={(event) => setHtml(event.target.value)} rows={6} />
        ) : (
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="http://localhost:5173"
          />
        )}
      </div>
    </section>
  );
}
