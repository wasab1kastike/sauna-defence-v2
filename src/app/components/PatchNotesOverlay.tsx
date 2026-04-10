import { useState } from 'react';
import { allPatchNotes } from '../../content/patchNotes';
import { formatPatchNotesDate } from '../uiHelpers';

interface PatchNotesOverlayProps {
  onClose: () => void;
}

export function PatchNotesOverlay({ onClose }: PatchNotesOverlayProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePatchNotes = allPatchNotes[activeIndex] ?? allPatchNotes[0];
  const canViewNewer = activeIndex > 0;
  const canViewOlder = activeIndex < allPatchNotes.length - 1;

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
            <p className="eyebrow">{activeIndex === 0 ? 'Tuoreimmat kuulumiset' : 'Aiemmat kuulumiset'}</p>
            <h2 id="patch-notes-title">Patch Notes</h2>
            <p className="panel-copy small-copy">Pieni katsaus siihen, mika tekee seuraavasta runista sujuvamman.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>
            Sulje
          </button>
        </div>
        <div className="patch-notes-body">
          <div className="patch-notes-meta">
            <span className="version-badge">Versio {activePatchNotes.version}</span>
            <span className="panel-copy small-copy">{formatPatchNotesDate(activePatchNotes.date)}</span>
          </div>
          <p className="panel-copy patch-notes-intro">{activePatchNotes.intro}</p>
          <div className="patch-notes-grid">
            {activePatchNotes.sections.map((section) => (
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
          {allPatchNotes.length > 1 ? (
            <>
              <button className="ghost-button" onClick={() => setActiveIndex((current) => Math.max(0, current - 1))} disabled={!canViewNewer}>
                Uudempi
              </button>
              <button className="ghost-button" onClick={() => setActiveIndex((current) => Math.min(allPatchNotes.length - 1, current + 1))} disabled={!canViewOlder}>
                Vanhempi
              </button>
            </>
          ) : null}
          <button className="primary-button" onClick={onClose}>
            Jatka peliin
          </button>
        </div>
      </section>
    </div>
  );
}
