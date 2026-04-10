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
        <div className="patch-notes-body">
          <div className="patch-notes-meta">
            <span className="version-badge">Versio {latestPatchNotes.version}</span>
            <span className="panel-copy small-copy">{formatPatchNotesDate(latestPatchNotes.date)}</span>
          </div>
          <p className="panel-copy patch-notes-intro">{latestPatchNotes.intro}</p>
          <div className="patch-notes-grid">
            {latestPatchNotes.sections.map((section) => (
              <section className="inventory-card patch-notes-section" key={section.id}>
                <h3>{section.title}</h3>
                {section.items.length > 0 ? (
                  <ul>
                    {section.items.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="panel-copy small-copy patch-notes-empty">Tassa laatikossa ei ole talla kertaa ylimaaraisia saunadraamoja.</p>
                )}
              </section>
            ))}
          </div>
        </div>
        <div className="button-row patch-notes-actions">
          <button className="primary-button" onClick={onClose}>
            Jatka peliin
          </button>
        </div>
      </section>
    </div>
  );
}
