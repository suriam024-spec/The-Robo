// หน้า Setup — เลือกทิศเริ่มต้นของ Robo
import { DIRECTIONS } from '../../data/constants.js'

function RoboDirectionPanel({ direction, onChange }) {
  return (
    <section className="setup-panel" aria-labelledby="direction-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 03</span>
        <h2 id="direction-title">เลือกทิศเริ่มต้นของ Robo</h2>
        <p>Robo จะเริ่มต้นที่จุดกึ่งกลางกระดาน โดยหันไปตามทิศที่เลือก</p>
      </div>

      <div className="direction-picker" role="group" aria-label="เลือกทิศเริ่มต้น">
        {DIRECTIONS.map((item) => (
          <button
            className={`direction-button ${direction === item.id ? 'selected' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={direction === item.id}
            onClick={() => onChange(item.id)}
          >
            <span className="direction-arrow" aria-hidden="true">{item.arrow}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default RoboDirectionPanel