// เครื่องมือทดสอบ (ชั่วคราว ขึ้นเฉพาะตอน npm run dev): ปุ่มเริ่มสถานการณ์ทดสอบจากหน้า Setup
import { describeCell } from '../../utils/describe.js'

function DevScenarioPanel({ scenarios, onStart }) {
  return (
    <div className="private-card test-panel">
      <div className="private-card-title">
        สถานการณ์ทดสอบ <span>· เฉพาะ npm run dev ลบได้ภายหลัง</span>
      </div>
      <p className="private-note">
        กดปุ่มเดียวเพื่อข้ามไปหน้ากระดานที่วาง Obstacle ไว้ให้แล้ว (ใช้ผู้เล่นตามที่ตั้งค่าไว้ด้านบน
        Starting Point อยู่ที่ {describeCell(4, 4)})
      </p>
      <div className="test-command-grid">
        {scenarios.map((scenario) => (
          <button
            className="test-command-button"
            key={scenario.id}
            type="button"
            onClick={() => onStart(scenario)}
          >
            <span className="test-command-name">{scenario.title}</span>
            <span className="test-command-desc">{scenario.summary}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default DevScenarioPanel