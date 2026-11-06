// M2: แผงตาของผู้เล่น (เริ่มตา / เปิด-ซ่อน Hand และ Secret Mission / แผงทดสอบการเดิน / จบตา)
import MovementTestPanel from '../Robo/MovementTestPanel.jsx'

function TurnPanel({
  players,
  currentIndex,
  turnOrder,
  turnDirectionLabel,
  turnActive,
  handOpen,
  missionOpen,
  crashCount,
  lastMove,
  pendingWarp,
  onStartTurn,
  onToggleHand,
  onToggleMission,
  onMove,
  onChooseWarp,
  onEndTurn,
  onResetGame,
}) {
  const currentPlayer = players[currentIndex]

  return (
    <section className="turn-panel" aria-labelledby="turn-title">
      <div className="turn-heading">
        <span className="step-label">CURRENT TURN · {turnDirectionLabel}</span>
        <h2 id="turn-title">
          ตาของ <span className="highlight-name">{currentPlayer.name}</span>
        </h2>
      </div>

      <ol className="turn-order" aria-label="ลำดับตาของผู้เล่น">
        {turnOrder.map((playerIndex) => (
          <li
            className={`turn-chip ${playerIndex === currentIndex ? 'current' : ''}`}
            key={players[playerIndex].id}
          >
            {players[playerIndex].name}
          </li>
        ))}
      </ol>

      {!turnActive && (
        <div className="turn-ready">
          <p className="screen-text">
            ส่งอุปกรณ์ให้ {currentPlayer.name} แล้วกดเริ่มตา
            Hand และ Secret Mission จะยังถูกซ่อนไว้จนกว่าจะกดปุ่ม
          </p>
          <button className="primary-button" type="button" onClick={onStartTurn}>
            เริ่มตา · {currentPlayer.name}
          </button>
        </div>
      )}

      {turnActive && (
        <div className="turn-active">
          <div className="private-toggles">
            <button
              className={`toggle-button ${handOpen ? 'open' : ''}`}
              type="button"
              aria-expanded={handOpen}
              onClick={onToggleHand}
            >
              {handOpen ? 'ซ่อน Hand' : 'เปิด Hand'}
            </button>
            <button
              className={`toggle-button ${missionOpen ? 'open' : ''}`}
              type="button"
              aria-expanded={missionOpen}
              onClick={onToggleMission}
            >
              {missionOpen ? 'ซ่อน Secret Mission' : 'เปิด Secret Mission'}
            </button>
          </div>

          {handOpen && (
            <div className="private-card hand-card">
              <div className="private-card-title">
                HAND <span>· ข้อมูลทดสอบชั่วคราว</span>
              </div>

              <div className="card-group-label">Movement Cards (4)</div>
              <ul className="card-row">
                {currentPlayer.movementCards.map((card, index) => (
                  <li className="game-card movement-card" key={`${card}-${index}`}>
                    {card}
                  </li>
                ))}
              </ul>

              <div className="card-group-label">Virus Cards (2)</div>
              <ul className="card-row">
                {currentPlayer.virusCards.map((card, index) => (
                  <li className="game-card virus-card" key={`${card}-${index}`}>
                    {card}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missionOpen && (
            <div className="private-card mission-card">
              <div className="private-card-title">
                SECRET MISSION <span>· ข้อมูลทดสอบชั่วคราว</span>
              </div>
              <div className="mission-name">{currentPlayer.mission}</div>
              <p className="private-note">เห็นได้เฉพาะ {currentPlayer.name} เท่านั้น</p>
            </div>
          )}

          <MovementTestPanel
            crashCount={crashCount}
            lastMove={lastMove}
            pendingWarp={pendingWarp}
            onMove={onMove}
            onChooseWarp={onChooseWarp}
          />

          <button
            className="primary-button end-turn-button"
            type="button"
            disabled={Boolean(pendingWarp)}
            onClick={onEndTurn}
          >
            {pendingWarp ? 'เลือกปลายทาง Hole ก่อนจบตา' : 'จบตา · ส่งต่อผู้เล่นถัดไป'}
          </button>
        </div>
      )}

      <button className="text-button" type="button" onClick={onResetGame}>
        รีเซ็ตเกม (กลับไปตั้งค่าผู้เล่น)
      </button>
    </section>
  )
}

export default TurnPanel