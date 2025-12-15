export function PreviewPane() {
  return (
    <section className="panel preview">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Live Preview</p>
          <h2>Embedded Web View</h2>
        </div>
        <button className="ghost">Open in new tab</button>
      </header>
      <div className="preview__frame">
        <div className="preview__placeholder">
          <p>Preview server not running</p>
          <small>Start a local preview to see your app live with hot reload.</small>
        </div>
      </div>
    </section>
  );
}
