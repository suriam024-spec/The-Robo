// M2: หน้า Setup — จำนวนผู้เล่น (2–6 คน) และการแก้ไขชื่อ
import { MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS } from '../../data/constants.js'

function PlayerSetupPanel({ players, onAdd, onRemove, onRename }) {
  return (
    <section className="setup-panel player-setup" aria-labelledby="players-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 01</span>
        <h2 id="players-title">ผู้เล่น</h2>
        <p>รองรับ 2–6 คน แก้ไขชื่อได้ตามต้องการ</p>
      </div>

      <div className="player-count">
        <button
          className="count-button"
          type="button"
          aria-label="ลบผู้เล่น"
          disabled={players.length <= MIN_PLAYERS}
          onClick={onRemove}
        >
          −
        </button>
        <div className="count-value" aria-live="polite">
          <strong>{players.length}</strong>
          <span>คน</span>
        </div>
        <button
          className="count-button"
          type="button"
          aria-label="เพิ่มผู้เล่น"
          disabled={players.length >= MAX_PLAYERS}
          onClick={onAdd}
        >
          +
        </button>
      </div>

      <ul className="player-list">
        {players.map((player, index) => (
          <li className="player-row" key={player.id}>
            <span className="player-badge">{index + 1}</span>
            <input
              className="player-input"
              type="text"
              value={player.name}
              maxLength={MAX_NAME_LENGTH}
              aria-label={`ชื่อผู้เล่นคนที่ ${index + 1}`}
              onChange={(event) => onRename(player.id, event.target.value)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default PlayerSetupPanel