// M4.1: หน้า Setup — กำหนดจำนวนการ์ด Movement แต่ละชนิด (ไว้ปรับระหว่างทดสอบ)
import { MAX_CARDS_PER_TYPE, MOVEMENT_CARD_TYPES, MOVEMENT_HAND_SIZE, DEFAULT_MOVEMENT_COUNTS, canDealMovement, countMovementTotal } from '../../game/cards/movementCards.js'
import { describeCommand } from '../../utils/describe.js'

// แปลงข้อความจากช่องกรอกเป็นจำนวนเต็ม 0–MAX (ช่องว่างหรือพิมพ์ผิดนับเป็น 0)
function toCount(rawValue) {
  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.min(MAX_CARDS_PER_TYPE, Math.max(0, parsed))
}

function CardCountsPanel({ counts, playerCount, onChange, onReset }) {
  const total = countMovementTotal(counts)
  const needed = playerCount * MOVEMENT_HAND_SIZE
  const deal = canDealMovement(counts, playerCount)
  const defaultTotal = countMovementTotal(DEFAULT_MOVEMENT_COUNTS)

  return (
    <section className="setup-panel player-setup" aria-labelledby="card-counts-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 04</span>
        <h2 id="card-counts-title">จำนวนการ์ด Movement</h2>
        <p>
          กำหนดจำนวนการ์ดแต่ละชนิดในกองกลาง (ใช้กับเกมที่เริ่มต่อจากนี้ ค่าถูกจำไว้ในเบราว์เซอร์นี้)
          ค่าเริ่มต้นเป็นค่าชั่วคราวรอ Playtest
        </p>
      </div>

      <div className="player-count">
        <div className="count-value" aria-live="polite">
          <strong>{total}</strong>
          <span>ใบ · ผู้เล่น {playerCount} คนใช้แจกมือ {needed} ใบ</span>
        </div>
      </div>

      <div className="test-command-grid">
        {MOVEMENT_CARD_TYPES.map((type) => (
          <label className="test-command-button" key={type.id}>
            <span className="test-command-name">{type.label}</span>
            <span className="test-command-desc">{describeCommand(type)}</span>
            <input
              className="player-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_CARDS_PER_TYPE}
              step={1}
              value={counts[type.id]}
              onChange={(event) => onChange(type.id, toCount(event.target.value))}
            />
          </label>
        ))}
      </div>

      {!deal.ok && (
        <p className="placement-message" role="alert">
          {deal.message} — เพิ่มจำนวนการ์ดก่อนจึงจะเริ่มเกมได้
        </p>
      )}

      <button className="secondary-button" type="button" onClick={onReset}>
        คืนค่าเริ่มต้น ({defaultTotal} ใบ)
      </button>
    </section>
  )
}

export default CardCountsPanel