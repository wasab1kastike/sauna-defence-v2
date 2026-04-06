import { latestPatchNotes } from '../../content/patchNotes';
import { formatPatchNotesDate } from '../uiHelpers';

interface PatchNotesOverlayProps {
  onClose: () => void;
}

export function PatchNotesOverlay({ onClose }: PatchNotesOverlayProps) {
  return (
    <div
      className="overlay-shell patch-notes-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patch-notes-title"
      onClick={onClose}
    >
      <section className="overlay-card patch-notes-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head patch-notes-head">
          <div>
            <p className="eyebrow">Tuoreimmat kuulumiset</p>
            <h2 id="patch-notes-title">Patch Notes</h2>
            <p className="panel-copy small-copy">Pieni katsaus siihen, mika tekee seuraavasta runista sujuvamman.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>
            Sulje
          </button>
        </div>
        <div className="patch-notes-meta">
          <span className="version-badge">Versio {latestPatchNotes.version}</span>
          <span className="panel-copy small-copy">{formatPatchNotesDate(latestPatchNotes.date)}</span>
        </div>
        <div className="patch-notes-grid">
          <section className="inventory-card patch-notes-section">
            <h3>New</h3>
            <ul>
              {latestPatchNotes.new.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>
          <section className="inventory-card patch-notes-section">
            <h3>Improved</h3>
            <ul>
              {latestPatchNotes.improved.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>
          <section className="inventory-card patch-notes-section">
            <h3>Fixed</h3>
            <ul>
              {latestPatchNotes.fixed.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={onClose}>
            Jatka peliin
          </button>
        </div>
      </section>
    </div>
  );
}
