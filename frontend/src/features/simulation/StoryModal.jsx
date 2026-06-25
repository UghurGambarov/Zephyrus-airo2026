// "Simulation Control Center" modal — narrates the attacker's journey live.

import { STORY } from "./story";

export function StoryModal({ story, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-dot" />
            <span className="modal-title">SİMULYASİYA İDARƏ MƏRKƏZİ</span>
          </div>
          <button className="modal-x" onClick={onClose} title="Bağla">✕</button>
        </div>

        <div className="phase-strip">
          {STORY.map((ph, i) => {
            const cls = i < story.phase ? "done" : i === story.phase ? "live" : "pending";
            return (
              <div key={ph.name} className={`phase ${cls}`}>
                <span className="phase-ico">{i < story.phase ? "✓" : ph.ico}</span>
                <span className="phase-ad">{ph.name}</span>
              </div>
            );
          })}
        </div>

        <div className="term">
          {story.lines.map((l, i) => (
            <div key={i} className={`term-line p${l.phase}`}>
              <span className="term-prompt">root@adversary:~$</span> {l.text}
            </div>
          ))}
          {!story.done && <div className="term-cursor">▋</div>}
        </div>

        <div className="modal-foot">
          {story.done ? (
            <span className="foot-done">
              ✓ Simulyasiya tamamlandı — texniki loglar arxa fonda "Canlı Siqnallar"-a düşdü.
            </span>
          ) : (
            <span className="foot-live">● Hücum gedir... loglar real-vaxt toplanır</span>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Bağla</button>
        </div>
      </div>
    </div>
  );
}
