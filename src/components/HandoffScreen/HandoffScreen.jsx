// M2: หน้าส่งต่ออุปกรณ์ให้ผู้เล่นคนถัดไป (ซ่อนข้อมูลของผู้เล่นคนก่อน)

function HandoffScreen({ nextPlayerName, onStartTurn }) {
  return (
    <section className="screen-card handoff" aria-labelledby="handoff-title">
      <span className="step-label">HANDOFF</span>
      <h2 id="handoff-title">
        ส่งอุปกรณ์ให้ <span className="highlight-name">{nextPlayerName}</span>
      </h2>
      <p className="screen-text">
        ข้อมูลของผู้เล่นคนก่อนถูกซ่อนไว้เรียบร้อยแล้ว
        เมื่อ {nextPlayerName} พร้อมแล้วให้กดปุ่มด้านล่างเพื่อเริ่มตา
      </p>
      <div className="screen-actions">
        <button className="primary-button" type="button" onClick={onStartTurn}>
          ฉันคือ {nextPlayerName} · เริ่มตา
        </button>
      </div>
    </section>
  )
}

export default HandoffScreen