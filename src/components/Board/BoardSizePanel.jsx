// หน้า Setup — เลือกขนาดกระดาน (9/11/13)
import { BOARD_SIZES } from '../../data/constants.js'

function BoardSizePanel({ boardSize, onChange }) {
  return (
    <section className="setup-panel" aria-labelledby="board-size-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 02</span>
        <h2 id="board-size-title">เลือกขนาดกระดาน</h2>
        <p>Starting Point จะอยู่กึ่งกลางกระดานเสมอ เปลี่ยนขนาดไม่ได้หลังเริ่มเกม</p>
      </div>

      <div className="size-picker" role="group" aria-label="เลือกขนาดกระดาน">
        {BOARD_SIZES.map((size) => (
          <button
            className={`direction-button size-button ${boardSize === size ? 'selected' : ''}`}
            key={size}
            type="button"
            aria-pressed={boardSize === size}
            onClick={() => onChange(size)}
          >
            <span className="size-value">{size}×{size}</span>
            <span className="size-cells">{size * size} ช่อง</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default BoardSizePanel