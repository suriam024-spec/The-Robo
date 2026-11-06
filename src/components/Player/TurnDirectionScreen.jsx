// M2: ผู้เล่นคนแรกเลือกทิศทางการวนของเกม (วนขวา/วนซ้าย)
import { TURN_DIRECTIONS } from '../../data/constants.js'

function TurnDirectionScreen({ firstPlayerName, selected, onSelect, onConfirm, onBack }) {
  return (
    <section className="screen-card" aria-labelledby="turn-direction-title">
      <span className="step-label">GAME SETUP · 04</span>
      <h2 id="turn-direction-title">
        ผู้เล่นคนแรกคือ <span className="highlight-name">{firstPlayerName}</span>
      </h2>
      <p className="screen-text">
        ให้ {firstPlayerName} เลือกทิศทางการวนของเกม ผู้เล่นคนอื่นจะเล่นตามลำดับที่เกิดขึ้น
      </p>

      <div className="turn-direction-picker" role="group" aria-label="เลือกทิศทางการวน">
        {TURN_DIRECTIONS.map((item) => (
          <button
            className={`turn-direction-button ${selected === item.id ? 'selected' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={selected === item.id}
            onClick={() => onSelect(item.id)}
          >
            <span className="turn-direction-arrow" aria-hidden="true">{item.arrow}</span>
            <span className="turn-direction-label">{item.label}</span>
            <span className="turn-direction-hint">{item.hint}</span>
          </button>
        ))}
      </div>

      <div className="screen-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          ← กลับไปตั้งค่าผู้เล่น
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={!selected}
          onClick={onConfirm}
        >
          ยืนยันและไปวาง Obstacle
        </button>
      </div>
    </section>
  )
}

export default TurnDirectionScreen