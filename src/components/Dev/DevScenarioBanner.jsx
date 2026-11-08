// เครื่องมือทดสอบ (ชั่วคราว ขึ้นเฉพาะตอน npm run dev): บอกว่าต้องกดอะไร และควรเห็นอะไร ระหว่างทดสอบสถานการณ์

function DevScenarioBanner({ scenario, onRestart, onExit }) {
  return (
    <div className="private-card test-panel">
      <div className="private-card-title">
        สถานการณ์ทดสอบ <span>· {scenario.title}</span>
      </div>

      <div className="card-group-label">สิ่งที่ต้องกด</div>
      <ol className="private-note">
        {scenario.steps.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ol>

      <div className="card-group-label">ควรเห็นอะไร</div>
      <ul className="private-note">
        {scenario.expect.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>

      <button className="secondary-button" type="button" onClick={onRestart}>
        เริ่มสถานการณ์นี้ใหม่
      </button>
      <button className="text-button" type="button" onClick={onExit}>
        ออกจากสถานการณ์ (กลับหน้า Setup)
      </button>
    </div>
  )
}

export default DevScenarioBanner