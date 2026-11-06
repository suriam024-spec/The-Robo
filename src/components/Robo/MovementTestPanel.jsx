// M3.1: แผงทดสอบการเคลื่อนที่ (ชั่วคราว ลบเมื่อทำ M4 เสร็จ) + กล่องเลือกปลายทางของ The Hole
import { CRASH_LIMIT } from '../../data/constants.js'
import { MOVEMENT_COMMANDS } from '../../game/movement/movement.js'
import { describeCell, describeCommand, describeLastMove } from '../../utils/describe.js'

function MovementTestPanel({ crashCount, lastMove, pendingWarp, onMove, onChooseWarp }) {
  const isChoosingWarp = Boolean(pendingWarp)

  return (
    <div className="private-card test-panel">
      <div className="private-card-title">
        แผงทดสอบการเคลื่อนที่ <span>· ชั่วคราว จะถูกแทนด้วยการ์ดใน M4</span>
      </div>

      <div className="crash-counter" aria-live="polite">
        <span className="crash-label">CRASH</span>
        <strong>{crashCount} / {CRASH_LIMIT}</strong>
        <span className="crash-note">แสดงผลอย่างเดียว</span>
      </div>

      {isChoosingWarp && (
        <div className="warp-chooser" role="group" aria-label="เลือกปลายทางของ The Hole">
          <p className="warp-note">
            Robo ก้าวเข้า The Hole ที่ {describeCell(pendingWarp.row, pendingWarp.col)}
            เลือกปลายทางที่จะวาร์ปไป (ช่องที่เลือกได้ถูกไฮไลต์บนกระดาน)
          </p>
          <div className="warp-choice-list">
            {pendingWarp.destinations.map((item) => (
              <button
                className="warp-choice-button"
                key={item.uid}
                type="button"
                onClick={() => onChooseWarp(item.uid)}
              >
                Hole ที่ {describeCell(item.row, item.col)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="test-command-grid">
        {MOVEMENT_COMMANDS.map((command) => (
          <button
            className="test-command-button"
            key={command.id}
            type="button"
            disabled={isChoosingWarp}
            onClick={() => onMove(command.id)}
          >
            <span className="test-command-name">{command.label}</span>
            <span className="test-command-desc">{describeCommand(command)}</span>
          </button>
        ))}
      </div>

      <p className="test-result" aria-live="polite">{describeLastMove(lastMove)}</p>
    </div>
  )
}

export default MovementTestPanel