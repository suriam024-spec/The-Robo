// M4.2.1: การ์ดสรุปจำนวนการ์ดในหน้า Setup — บอกจำนวนรวมของกอง Movement / Virus และเตือนเมื่อการ์ดไม่พอแจก
// ตัวกำหนดจำนวนแต่ละชนิดอยู่ในหน้าแยก (CardSettingsScreen) กดปุ่มด้านล่างเพื่อเข้าไป
import {
  MOVEMENT_HAND_SIZE,
  canDealMovement,
  countMovementTotal,
} from '../../game/cards/movementCards.js'
import { VIRUS_HAND_SIZE, canDealVirus, countVirusTotal } from '../../game/cards/virusCards.js'

function CardCountsSummary({ movementCounts, virusCounts, playerCount, onOpen }) {
  const movementDeal = canDealMovement(movementCounts, playerCount)
  const virusDeal = canDealVirus(virusCounts, playerCount)

  return (
    <section className="setup-panel player-setup" aria-labelledby="card-summary-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 04</span>
        <h2 id="card-summary-title">จำนวนการ์ด</h2>
        <p>
          จำนวนการ์ด Movement และ Virus แต่ละชนิดในกองกลางตั้งได้ที่หน้าแยก
          (ค่าถูกจำไว้ในเบราว์เซอร์นี้ ค่าเริ่มต้นเป็นค่าชั่วคราวรอ Playtest)
        </p>
      </div>

      <div className="player-count">
        <div className="count-value" aria-live="polite">
          <strong>{countMovementTotal(movementCounts)}</strong>
          <span>ใบ Movement · ผู้เล่น {playerCount} คนใช้แจกมือ {playerCount * MOVEMENT_HAND_SIZE} ใบ</span>
        </div>
      </div>

      <div className="player-count">
        <div className="count-value" aria-live="polite">
          <strong>{countVirusTotal(virusCounts)}</strong>
          <span>ใบ Virus · ผู้เล่น {playerCount} คนใช้แจกมือ {playerCount * VIRUS_HAND_SIZE} ใบ</span>
        </div>
      </div>

      {!movementDeal.ok && (
        <p className="placement-message" role="alert">
          {movementDeal.message} — กดปุ่มด้านล่างเพื่อเพิ่มจำนวนการ์ดก่อนจึงจะเริ่มเกมได้
        </p>
      )}
      {!virusDeal.ok && (
        <p className="placement-message" role="alert">
          {virusDeal.message} — กดปุ่มด้านล่างเพื่อเพิ่มจำนวนการ์ดก่อนจึงจะเริ่มเกมได้
        </p>
      )}

      <button className="secondary-button" type="button" onClick={onOpen}>
        ตั้งค่าจำนวนการ์ด →
      </button>
    </section>
  )
}

export default CardCountsSummary