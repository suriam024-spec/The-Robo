// M4.2.1: หน้าแยก "ตั้งค่าจำนวนการ์ด" (ย้ายออกจากหน้า Setup ให้หน้า Setup สั้นลง)
// วางกล่อง Movement แล้วตามด้วยกล่อง Virus (ใช้ CardCountsPanel ตัวเดิม) ค่าที่ตั้งยังถูกจำในเบราว์เซอร์เหมือนเดิม
import CardCountsPanel from './CardCountsPanel.jsx'

function CardSettingsScreen({
  movementCounts,
  virusCounts,
  playerCount,
  onChangeMovement,
  onResetMovement,
  onChangeVirus,
  onResetVirus,
  onBack,
}) {
  return (
    <div className="card-settings-page">
      <section className="screen-card" aria-labelledby="card-settings-title">
        <span className="step-label">GAME SETUP · CARDS</span>
        <h2 id="card-settings-title">ตั้งค่าจำนวนการ์ด</h2>
        <p className="screen-text">
          กำหนดจำนวนการ์ดแต่ละชนิดของกอง Movement และกอง Virus ใช้กับเกมที่เริ่มต่อจากนี้
          ผู้เล่นที่ตั้งไว้ตอนนี้ {playerCount} คน เมื่อตั้งเสร็จกดกลับไปหน้าตั้งค่าเพื่อเริ่มเกม
        </p>
        <div className="screen-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            ← กลับหน้าตั้งค่า
          </button>
        </div>
      </section>

      <CardCountsPanel
        kind="movement"
        counts={movementCounts}
        playerCount={playerCount}
        onChange={onChangeMovement}
        onReset={onResetMovement}
      />

      <CardCountsPanel
        kind="virus"
        counts={virusCounts}
        playerCount={playerCount}
        onChange={onChangeVirus}
        onReset={onResetVirus}
      />

      <div className="screen-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          ← กลับหน้าตั้งค่า
        </button>
      </div>
    </div>
  )
}

export default CardSettingsScreen
