// M3.2: หน้าส่งต่ออุปกรณ์ก่อนผู้เล่นแต่ละคนวาง Obstacle (ซ่อน Obstacle ในมือจนกดเริ่ม)

function ObstacleHandoffScreen({ playerName, obstacleCount, step, total, onStart }) {
  return (
    <section className="screen-card handoff" aria-labelledby="obstacle-handoff-title">
      <span className="step-label">OBSTACLE SETUP · {step}/{total}</span>
      <h2 id="obstacle-handoff-title">
        ส่งอุปกรณ์ให้ <span className="highlight-name">{playerName}</span>
      </h2>
      <p className="screen-text">
        {playerName} จะได้วาง Obstacle {obstacleCount} ใบลงบนกระดาน
        Obstacle ในมือถูกซ่อนไว้จนกว่าจะกดปุ่มด้านล่าง
      </p>
      <div className="screen-actions">
        <button className="primary-button" type="button" onClick={onStart}>
          ฉันคือ {playerName} · เริ่มวาง Obstacle
        </button>
      </div>
    </section>
  )
}

export default ObstacleHandoffScreen