// M3.2: แผงวาง Obstacle (เลือกชนิด → แตะช่อง → กดยืนยันวาง)
import { getObstacleType } from '../../game/obstacles/obstacles.js'

function ObstaclePlacementPanel({
  playerName,
  step,
  total,
  hand,
  selectedUid,
  pendingCell,
  message,
  onSelect,
  onConfirm,
  onFinish,
  onResetGame,
}) {
  const selectedObstacle = hand.find((item) => item.uid === selectedUid) ?? null
  const selectedType = selectedObstacle ? getObstacleType(selectedObstacle.typeId) : null
  const isLastPlayer = step >= total

  return (
    <section className="turn-panel" aria-labelledby="obstacle-title">
      <div className="turn-heading">
        <span className="step-label">OBSTACLE SETUP · {step}/{total}</span>
        <h2 id="obstacle-title">
          <span className="highlight-name">{playerName}</span> วาง Obstacle
        </h2>
      </div>

      <p className="screen-text">
        {hand.length > 0
          ? `เลือก Obstacle แล้วแตะช่องบนกระดาน จากนั้นกดยืนยัน (เหลือ ${hand.length} ใบ)`
          : 'วาง Obstacle ครบทุกใบแล้ว'}
      </p>

      {hand.length > 0 && (
        <div className="private-card">
          <div className="private-card-title">
            OBSTACLE ในมือ <span>· เห็นได้เฉพาะ {playerName}</span>
          </div>

          <ul className="card-row" aria-label="Obstacle ในมือ">
            {hand.map((item) => {
              const type = getObstacleType(item.typeId)
              return (
                <li key={item.uid}>
                  <button
                    className={`obstacle-choice ${item.uid === selectedUid ? 'selected' : ''}`}
                    type="button"
                    aria-pressed={item.uid === selectedUid}
                    onClick={() => onSelect(item.uid)}
                  >
                    {type.label}
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="placement-status">
            {pendingCell
              ? `ช่องที่เลือก: แถว ${pendingCell.row + 1} · คอลัมน์ ${pendingCell.col + 1}`
              : 'ยังไม่ได้เลือกช่องบนกระดาน'}
          </p>

          {message && (
            <p className="placement-message" role="alert">
              {message}
            </p>
          )}

          <button
            className="primary-button confirm-place-button"
            type="button"
            disabled={!selectedObstacle || !pendingCell}
            onClick={onConfirm}
          >
            {selectedType ? `ยืนยันวาง ${selectedType.label}` : 'ยืนยันวาง'}
          </button>
        </div>
      )}

      {hand.length === 0 && (
        <button className="primary-button" type="button" onClick={onFinish}>
          {isLastPlayer ? 'เสร็จสิ้น · เริ่มเกม' : 'เสร็จสิ้น · ส่งต่อผู้เล่นถัดไป'}
        </button>
      )}

      <button className="text-button" type="button" onClick={onResetGame}>
        รีเซ็ตเกม (กลับไปตั้งค่าผู้เล่น)
      </button>
    </section>
  )
}

export default ObstaclePlacementPanel