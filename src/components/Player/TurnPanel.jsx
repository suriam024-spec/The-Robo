// M2: แผงตาของผู้เล่น (เริ่มตา / เปิด-ซ่อน Hand และ Secret Mission / จบตา)
// M4.1: Hand แสดง Movement Cards จริง กดเล่นได้ 1 ใบต่อตา + แสดงผลการเดินและกล่องเลือกปลายทาง Hole (แทนแผงทดสอบเดิม)
// M4.2: Hand แสดง Virus Cards จริง (ชื่อ / WITH-HACK / ข้อความย่อ) ยังเล่นไม่ได้ (ผลของการ์ดทำใน M4.3) + ปุ่มสลับใต้กอง ตาละ 1 ครั้ง
import { CRASH_LIMIT } from '../../data/constants.js'
import { MOVEMENT_HAND_SIZE, getCardCommand } from '../../game/cards/movementCards.js'
import { VIRUS_HAND_SIZE, getVirusType } from '../../game/cards/virusCards.js'
import { describeCell, describeCommand, describeLastMove } from '../../utils/describe.js'

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
  hand,
  drawCount,
  discardCount,
  cardPlayed,
  virusHand,
  virusDrawCount,
  virusDiscardCount,
  virusSwapped,
  cardLog,
  onStartTurn,
  onToggleHand,
  onToggleMission,
  onPlayCard,
  onSwapVirus,
  onChooseWarp,
  onEndTurn,
  onResetGame,
}) {
  const currentPlayer = players[currentIndex]
  const isChoosingWarp = Boolean(pendingWarp)
  // สลับ Virus ใต้กองได้ตาละ 1 ครั้ง และเฉพาะตอนมี Virus ครบ 2 ใบ (V3)
  const virusHandFull = virusHand.length >= VIRUS_HAND_SIZE
  const canSwapVirus = virusHandFull && !virusSwapped

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

          <p className="private-note" aria-live="polite">
            Movement กองจั่ว {drawCount} ใบ · กองทิ้ง {discardCount} ใบ
            {' | '}
            Virus กองจั่ว {virusDrawCount} ใบ · กองทิ้ง {virusDiscardCount} ใบ
            {cardLog ? ` · ล่าสุด: ${cardLog}` : ''}
          </p>

          {handOpen && (
            <div className="private-card hand-card">
              <div className="private-card-title">
                HAND <span>· เห็นได้เฉพาะ {currentPlayer.name}</span>
              </div>

              <div className="card-group-label">
                Movement Cards ({hand.length}){cardPlayed ? ' · ใช้การ์ดตานี้แล้ว' : ' · กดการ์ดเพื่อเล่น (ตาละ 1 ใบ)'}
              </div>
              {hand.length === 0 ? (
                <p className="private-note">
                  มือว่าง จะเติมให้ครบ {MOVEMENT_HAND_SIZE} ใบเมื่อจบตา
                </p>
              ) : (
                <div className="test-command-grid">
                  {hand.map((card) => {
                    const command = getCardCommand(card)
                    return (
                      <button
                        className="test-command-button"
                        key={card.uid}
                        type="button"
                        disabled={cardPlayed || isChoosingWarp || !command}
                        onClick={() => onPlayCard(card.uid)}
                      >
                        <span className="test-command-name">{command ? command.label : card.typeId}</span>
                        <span className="test-command-desc">{command ? describeCommand(command) : ''}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="card-group-label">
                Virus Cards ({virusHand.length}) · ยังเล่นไม่ได้ (ผลของการ์ดทำใน M4.3)
              </div>
              {virusHand.length === 0 ? (
                <p className="private-note">
                  มือ Virus ว่าง จะจั่วให้ครบ {VIRUS_HAND_SIZE} ใบเมื่อจบตา
                </p>
              ) : (
                <ul className="card-row">
                  {virusHand.map((card) => {
                    const type = getVirusType(card.typeId)
                    return (
                      <li className="game-card virus-card" key={card.uid}>
                        <div>
                          {type ? type.label : card.typeId}
                          {type ? ` · ${type.kind}` : ''}
                        </div>
                        <p className="private-note">{type ? type.summary : ''}</p>
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={!canSwapVirus}
                          onClick={() => onSwapVirus(card.uid)}
                        >
                          ใต้กอง + จั่วใหม่
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="private-note">
                {virusSwapped
                  ? 'สลับ Virus ใต้กองแล้วในตานี้ (ตาละ 1 ครั้ง)'
                  : virusHandFull
                    ? 'สลับ Virus 1 ใบไปไว้ใต้กอง แล้วจั่วใบบนสุดมาแทนได้ตาละ 1 ครั้ง'
                    : `สลับใต้กองได้เฉพาะตอนมี Virus ครบ ${VIRUS_HAND_SIZE} ใบ`}
              </p>
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

          <div className="private-card">
            <div className="private-card-title">ผลการเคลื่อนที่</div>

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

            <p className="test-result" aria-live="polite">{describeLastMove(lastMove)}</p>
          </div>

          <button
            className="primary-button end-turn-button"
            type="button"
            disabled={isChoosingWarp}
            onClick={onEndTurn}
          >
            {isChoosingWarp ? 'เลือกปลายทาง Hole ก่อนจบตา' : 'จบตา · ส่งต่อผู้เล่นถัดไป'}
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