import { useState } from 'react'
import './styles/main.css'
import Board from './components/Board/Board.jsx'
import BoardSizePanel from './components/Board/BoardSizePanel.jsx'
import CardCountsPanel from './components/Cards/CardCountsPanel.jsx'
import DevScenarioBanner from './components/Dev/DevScenarioBanner.jsx'
import DevScenarioPanel from './components/Dev/DevScenarioPanel.jsx'
import HandoffScreen from './components/HandoffScreen/HandoffScreen.jsx'
import ObstacleHandoffScreen from './components/HandoffScreen/ObstacleHandoffScreen.jsx'
import ObstaclePlacementPanel from './components/Obstacles/ObstaclePlacementPanel.jsx'
import PlayerSetupPanel from './components/Player/PlayerSetupPanel.jsx'
import TurnDirectionScreen from './components/Player/TurnDirectionScreen.jsx'
import TurnPanel from './components/Player/TurnPanel.jsx'
import RoboDirectionPanel from './components/Robo/RoboDirectionPanel.jsx'
import {
  CRASH_LIMIT,
  DEFAULT_BOARD_SIZE,
  DEFAULT_PLAYER_COUNT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TURN_DIRECTIONS,
} from './data/constants.js'
import { DEV_SCENARIOS, buildScenarioCardState, buildScenarioObstacles } from './data/devScenarios.js'
import { dealPlaceholders } from './data/placeholders.js'
import {
  applyMovementCommand,
  createRobo,
  finishHoleWarp,
  getStartPosition,
} from './game/movement/movement.js'
import {
  canPlaceObstacle,
  damageObstacle,
  dealObstacles,
  getDamageDuration,
  placeObstacle,
  tickDamage,
} from './game/obstacles/obstacles.js'
import {
  DEFAULT_MOVEMENT_COUNTS,
  MOVEMENT_HAND_SIZE,
  buildMovementDeck,
  canDealMovement,
  getCardCommand,
  validateMovementCounts,
} from './game/cards/movementCards.js'
import { createCardState, playCard, refillHand } from './game/cards/deck.js'
import { createDefaultSetupPlayers, getNextIndex, getTurnOrder } from './game/players.js'
import { getDirectionInfo } from './utils/describe.js'

// จำค่าจำนวนการ์ด Movement ที่ตั้งไว้ในเบราว์เซอร์นี้ (ถ้าอ่านไม่ได้หรือค่าไม่ผ่านการตรวจ ใช้ค่าเริ่มต้น)
const COUNTS_STORAGE_KEY = 'therobo.movementCounts.v1'

function loadMovementCounts() {
  try {
    const raw = window.localStorage.getItem(COUNTS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (validateMovementCounts(parsed).ok) return parsed
    }
  } catch {
    // อ่านไม่ได้ → ใช้ค่าเริ่มต้น
  }
  return { ...DEFAULT_MOVEMENT_COUNTS }
}

function saveMovementCounts(counts) {
  try {
    window.localStorage.setItem(COUNTS_STORAGE_KEY, JSON.stringify(counts))
  } catch {
    // เก็บไม่ได้ก็ใช้ต่อได้ แค่ไม่ถูกจำไว้
  }
}

function App() {
  // phase: 'setup' | 'direction' | 'obstacle-handoff' | 'obstacle' | 'board' | 'handoff'
  const [phase, setPhase] = useState('setup')

  // Setup
  const [setupPlayers, setSetupPlayers] = useState(createDefaultSetupPlayers)
  const [nextPlayerId, setNextPlayerId] = useState(DEFAULT_PLAYER_COUNT + 1)
  const [direction, setDirection] = useState('RIGHT') // ทิศเริ่มต้นของ Robo (M1)
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE)

  // Game
  const [players, setPlayers] = useState([])
  const [firstPlayerIndex, setFirstPlayerIndex] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pendingTurnDirection, setPendingTurnDirection] = useState(null)
  const [turnDirection, setTurnDirection] = useState('RIGHT')

  // Robo (M3.1): ตำแหน่ง ทิศ ตัวนับ Crash และผลการเคลื่อนที่ล่าสุด
  const [robo, setRobo] = useState(() => createRobo(DEFAULT_BOARD_SIZE, 'RIGHT'))
  const [crashCount, setCrashCount] = useState(0)
  const [lastMove, setLastMove] = useState(null)
  const [pendingWarp, setPendingWarp] = useState(null) // รอผู้เล่นเลือกปลายทางของ The Hole (M3.3)

  // Movement Cards (M4.1): จำนวนต่อชนิดที่ตั้งจากหน้า Setup, สถานะกอง/มือ, เล่นการ์ดตานี้แล้วหรือยัง, ข้อความเหตุการณ์ล่าสุด
  const [movementCounts, setMovementCounts] = useState(loadMovementCounts)
  const [cardState, setCardState] = useState(null) // { drawPile, discardPile, hands } (null ก่อนเริ่มเกม)
  const [cardPlayed, setCardPlayed] = useState(false)
  const [cardLog, setCardLog] = useState('')

  // Obstacle Setup (M3.2)
  const [obstacleHands, setObstacleHands] = useState([]) // มือที่เหลือของผู้เล่นแต่ละคน
  const [placedObstacles, setPlacedObstacles] = useState([])
  const [obstacleTurn, setObstacleTurn] = useState(0) // ลำดับที่ในรอบวาง (0 = คนแรก)
  const [selectedObstacleUid, setSelectedObstacleUid] = useState(null)
  const [pendingCell, setPendingCell] = useState(null)
  const [placementMessage, setPlacementMessage] = useState('')

  // เครื่องมือทดสอบ (ชั่วคราว): สถานการณ์ที่กำลังทดสอบอยู่ (ใช้ได้เฉพาะตอน npm run dev)
  const [activeScenario, setActiveScenario] = useState(null)

  // Turn / Privacy
  const [turnActive, setTurnActive] = useState(false)
  const [handOpen, setHandOpen] = useState(false)
  const [missionOpen, setMissionOpen] = useState(false)

  const turnDirectionInfo = TURN_DIRECTIONS.find((item) => item.id === turnDirection)

  // ผู้เล่นที่กำลังวาง Obstacle (เรียงตามลำดับตาเริ่มจากผู้เล่นคนแรก)
  const inObstaclePhase = phase === 'obstacle' || phase === 'obstacle-handoff'
  const obstaclePlayerIndex = inObstaclePhase
    ? getTurnOrder(firstPlayerIndex, players.length, turnDirectionInfo.step)[obstacleTurn]
    : null
  const currentObstacleHand = inObstaclePhase ? (obstacleHands[obstaclePlayerIndex] ?? []) : []
  const selectedObstacle =
    currentObstacleHand.find((item) => item.uid === selectedObstacleUid) ?? null

  function hidePrivateInfo() {
    setHandOpen(false)
    setMissionOpen(false)
  }

  function handleAddPlayer() {
    if (setupPlayers.length >= MAX_PLAYERS) return
    setSetupPlayers([
      ...setupPlayers,
      { id: nextPlayerId, name: `Player ${setupPlayers.length + 1}` },
    ])
    setNextPlayerId(nextPlayerId + 1)
  }

  function handleRemovePlayer() {
    if (setupPlayers.length <= MIN_PLAYERS) return
    setSetupPlayers(setupPlayers.slice(0, -1))
  }

  function handleRenamePlayer(id, name) {
    setSetupPlayers(
      setupPlayers.map((player) => (player.id === id ? { ...player, name } : player)),
    )
  }

  function handleChangeCardCount(typeId, value) {
    const next = { ...movementCounts, [typeId]: value }
    setMovementCounts(next)
    if (validateMovementCounts(next).ok) saveMovementCounts(next)
  }

  function handleResetCardCounts() {
    const next = { ...DEFAULT_MOVEMENT_COUNTS }
    setMovementCounts(next)
    saveMovementCounts(next)
  }

  function resetRobo() {
    setRobo(createRobo(boardSize, direction))
    setCrashCount(0)
    setLastMove(null)
    setPendingWarp(null)
  }

  function resetCards() {
    setCardState(null)
    setCardPlayed(false)
    setCardLog('')
  }

  // ทำให้ Obstacle uid นี้ชำรุดตามระยะของชนิดมัน (ถ้าชนิดนั้นไม่มีระบบชำรุด จะไม่เปลี่ยนอะไร)
  function damagePlacedObstacle(obstacles, uid) {
    const target = obstacles.find((item) => item.uid === uid)
    if (!target) return obstacles
    return damageObstacle(obstacles, uid, getDamageDuration(target.typeId))
  }

  // เดิน Robo ตามคำสั่งของการ์ดที่เล่น (ตรรกะการเดินเป็นของเดิมทั้งหมด)
  function runMovement(command) {
    const result = applyMovementCommand(robo, command, boardSize, placedObstacles)
    setRobo(result.robo)
    // ตกแมพ (crashed) และพังจาก Destroyer (destroyed) นับ Crash +1 ร่วมกัน (OWNER ตัดสิน D2)
    if (result.crashed || result.destroyed) {
      setCrashCount(crashCount + 1)
    }
    if (result.damageUids.length > 0) {
      setPlacedObstacles(
        result.damageUids.reduce(
          (list, uid) => damagePlacedObstacle(list, uid),
          placedObstacles,
        ),
      )
    }
    setPendingWarp(result.pendingWarp)
    setLastMove({
      label: command.label,
      steps: command.steps,
      stepsTaken: result.stepsTaken,
      crashed: result.crashed,
      blocked: result.blocked,
      returnedToStart: result.returnedToStart,
      stoppedBy: result.stoppedBy,
      destroyed: result.destroyed,
      extraSteps: result.extraSteps,
      retreatSteps: result.retreatSteps,
      bounces: result.bounces,
      warp: result.warp,
      pendingWarp: Boolean(result.pendingWarp),
      magnetEvents: result.magnetEvents,
      facingAfterTurn: result.facingAfterTurn,
    })
  }

  // เล่นการ์ด Movement จากมือผู้เล่นปัจจุบัน: การ์ดไปกองทิ้ง แล้วเดินตามคำสั่งของการ์ด (ตาละ 1 ใบ)
  function handlePlayCard(cardUid) {
    if (!cardState || pendingWarp || cardPlayed) return // ต้องเลือกปลายทางของ Hole ให้เสร็จก่อน / เล่นได้ตาละ 1 ใบ

    const card = cardState.hands[currentIndex].find((item) => item.uid === cardUid)
    const command = card ? getCardCommand(card) : null
    if (!command) return

    const played = playCard(cardState, currentIndex, cardUid)
    setCardState(played.state)
    setCardPlayed(true)
    runMovement(command)
  }

  function handleChooseWarp(destinationUid) {
    if (!pendingWarp) return

    // วาร์ปเสร็จแล้วต่อด้วยขั้น Magnet (ถ้าปลายทางอยู่ในระยะ Magnet จะถูกดึง)
    const done = finishHoleWarp(robo, pendingWarp, destinationUid, placedObstacles, boardSize)
    setRobo(done.robo)
    setPlacedObstacles(
      done.damageUids.reduce(
        (list, uid) => damagePlacedObstacle(list, uid),
        placedObstacles,
      ),
    )
    setPendingWarp(null)
    setLastMove({
      ...lastMove,
      pendingWarp: false,
      warp: done.warp,
      magnetEvents: done.magnetEvents,
    })
  }

  function resetObstacles() {
    setObstacleHands([])
    setPlacedObstacles([])
    setObstacleTurn(0)
    setSelectedObstacleUid(null)
    setPendingCell(null)
    setPlacementMessage('')
  }

  function handleStartObstacleTurn() {
    setSelectedObstacleUid(currentObstacleHand.length > 0 ? currentObstacleHand[0].uid : null)
    setPendingCell(null)
    setPlacementMessage('')
    setPhase('obstacle')
  }

  function handleObstacleCellClick(row, col) {
    if (currentObstacleHand.length === 0) return

    const check = canPlaceObstacle(row, col, boardSize, placedObstacles)
    if (!check.ok) {
      setPendingCell(null)
      setPlacementMessage(check.message)
      return
    }
    setPendingCell({ row, col })
    setPlacementMessage('')
  }

  function handleConfirmPlaceObstacle() {
    if (!selectedObstacle || !pendingCell) return

    const result = placeObstacle(
      placedObstacles,
      selectedObstacle,
      pendingCell.row,
      pendingCell.col,
      boardSize,
      obstaclePlayerIndex,
    )
    if (!result.ok) {
      setPendingCell(null)
      setPlacementMessage(result.message)
      return
    }

    const remaining = currentObstacleHand.filter((item) => item.uid !== selectedObstacle.uid)
    setPlacedObstacles(result.placed)
    setObstacleHands(
      obstacleHands.map((hand, index) => (index === obstaclePlayerIndex ? remaining : hand)),
    )
    setSelectedObstacleUid(remaining.length > 0 ? remaining[0].uid : null)
    setPendingCell(null)
    setPlacementMessage('')
  }

  function handleFinishObstacleTurn() {
    if (currentObstacleHand.length > 0) return

    setSelectedObstacleUid(null)
    setPendingCell(null)
    setPlacementMessage('')

    if (obstacleTurn + 1 < players.length) {
      setObstacleTurn(obstacleTurn + 1)
      setPhase('obstacle-handoff')
      return
    }

    // ทุกคนวางครบแล้ว → เริ่มเกมที่ผู้เล่นคนแรก
    setCurrentIndex(firstPlayerIndex)
    setTurnActive(false)
    hidePrivateInfo()
    setPhase('board')
  }

  function handleStartGame() {
    if (!canDealMovement(movementCounts, setupPlayers.length).ok) return // การ์ดไม่พอแจก (หน้า Setup แจ้งเตือนอยู่แล้ว)

    const readyPlayers = setupPlayers.map((player, index) => ({
      id: player.id,
      name: player.name.trim() || `Player ${index + 1}`,
      ...dealPlaceholders(index),
    }))
    const randomFirst = Math.floor(Math.random() * readyPlayers.length)

    resetRobo()
    resetObstacles()
    setActiveScenario(null)
    setCardState(createCardState(buildMovementDeck(movementCounts), readyPlayers.length, MOVEMENT_HAND_SIZE))
    setCardPlayed(false)
    setCardLog('')
    setPlayers(readyPlayers)
    setFirstPlayerIndex(randomFirst)
    setCurrentIndex(randomFirst)
    setPendingTurnDirection(null)
    setTurnActive(false)
    hidePrivateInfo()
    setPhase('direction')
  }

  // เครื่องมือทดสอบ (ชั่วคราว): ข้ามไปหน้ากระดานทันที โดยวาง Robo และ Obstacle ตามสถานการณ์
  // ไม่เปลี่ยนกติกาเกม: เล่นต่อด้วยฟังก์ชันเดินและจบตาตัวเดิมทั้งหมด (ผู้เล่นคนแรกเริ่มตาแล้ว วนขวา)
  function handleStartScenario(scenario) {
    const scenarioPlayers = scenario.playerCount ? setupPlayers.slice(0, scenario.playerCount) : setupPlayers
    const readyPlayers = scenarioPlayers.map((player, index) => ({
      id: player.id,
      name: player.name.trim() || `Player ${index + 1}`,
      ...dealPlaceholders(index),
    }))

    setBoardSize(scenario.boardSize)
    setRobo({ ...scenario.robo })
    setCrashCount(0)
    setLastMove(null)
    setPendingWarp(null)
    resetObstacles()
    setPlacedObstacles(buildScenarioObstacles(scenario))
    setCardState(buildScenarioCardState(scenario, readyPlayers.length))
    setCardPlayed(false)
    setCardLog('')
    setPlayers(readyPlayers)
    setFirstPlayerIndex(0)
    setCurrentIndex(0)
    setTurnDirection('RIGHT')
    setPendingTurnDirection(null)
    setTurnActive(true)
    hidePrivateInfo()
    setActiveScenario(scenario)
    setPhase('board')
  }

  function handleExitScenario() {
    setTurnActive(false)
    hidePrivateInfo()
    setPendingTurnDirection(null)
    resetRobo()
    resetObstacles()
    resetCards()
    setActiveScenario(null)
    setPhase('setup')
  }

  function handleBackToSetup() {
    setPendingTurnDirection(null)
    setPhase('setup')
  }

  function handleConfirmTurnDirection() {
    if (!pendingTurnDirection) return
    setTurnDirection(pendingTurnDirection)
    setCurrentIndex(firstPlayerIndex)
    setTurnActive(false)
    hidePrivateInfo()

    // M3.2: แจก Obstacle ให้ทุกคน แล้วเริ่มรอบวาง Obstacle จากผู้เล่นคนแรก
    setObstacleHands(dealObstacles(players.length, boardSize))
    setPlacedObstacles([])
    setObstacleTurn(0)
    setSelectedObstacleUid(null)
    setPendingCell(null)
    setPlacementMessage('')
    setPhase('obstacle-handoff')
  }

  function handleStartTurn() {
    hidePrivateInfo()
    setCardPlayed(false)
    setTurnActive(true)
    setPhase('board')
  }

  function handleEndTurn() {
    if (pendingWarp) return // ต้องเลือกปลายทางของ Hole ก่อนจบตา

    // เติมมือเมื่อมือหมด (ตัวแทนชั่วคราวของขั้น Draw/Refill ใน GDD หัวข้อ 26 จะย้ายไปผูกระบบรอบจริงใน M5)
    if (cardState) {
      const refill = refillHand(cardState, currentIndex, MOVEMENT_HAND_SIZE)
      setCardState(refill.state)
      if (refill.refilled) {
        setCardLog(
          `${players[currentIndex].name} มือหมด เติมมือ ${refill.drawn.length} ใบ${refill.reshuffled ? ' (สับกองทิ้งเป็นกองจั่วใหม่)' : ''}`,
        )
      }
    }
    setCardPlayed(false)

    const step = turnDirectionInfo.step
    const nextIndex = getNextIndex(currentIndex, players.length, step)

    // ตัวแทนชั่วคราวของ "จบรอบเกม" (M3): ผู้เล่นคนสุดท้ายของรอบกดจบตา → ลดตัวนับชำรุดลง 1
    // จะย้ายไปผูกกับระบบรอบจริงใน M5
    if (nextIndex === firstPlayerIndex) {
      setPlacedObstacles(tickDamage(placedObstacles))
    }

    setTurnActive(false)
    hidePrivateInfo()
    setCurrentIndex(nextIndex)
    setPhase('handoff')
  }

  function handleResetGame() {
    const confirmed = window.confirm('ต้องการรีเซ็ตเกมและกลับไปตั้งค่าผู้เล่นหรือไม่?')
    if (!confirmed) return
    setTurnActive(false)
    hidePrivateInfo()
    setPendingTurnDirection(null)
    resetRobo()
    resetObstacles()
    resetCards()
    setActiveScenario(null)
    setPhase('setup')
  }

  const isScreenMode =
    phase === 'direction' || phase === 'handoff' || phase === 'obstacle-handoff'
  // หน้า Setup แสดงตัวอย่าง Robo ตามขนาดและทิศที่เลือก, ตอนเล่นใช้ตำแหน่งจริงจาก State
  const displayRobo = phase === 'setup' ? createRobo(boardSize, direction) : robo
  const startPosition = getStartPosition(boardSize)
  const displayFacing = getDirectionInfo(displayRobo.facing)

  return (
    <main className={`game-shell ${isScreenMode ? 'screen-mode' : ''}`}>
      <header className="game-header">
        <div className="eyebrow">BOARD GAME PROTOTYPE</div>
        <h1>The Robo</h1>
        <p className="subtitle">วางแผนให้ดี แล้วพา Robo ออกผจญภัย</p>
      </header>

      {phase === 'setup' && (
        <>
          <Board robo={displayRobo} boardSize={boardSize} obstacles={placedObstacles} />
          <div className="side-stack">
            <PlayerSetupPanel
              players={setupPlayers}
              onAdd={handleAddPlayer}
              onRemove={handleRemovePlayer}
              onRename={handleRenamePlayer}
            />
            <BoardSizePanel boardSize={boardSize} onChange={setBoardSize} />
            <RoboDirectionPanel direction={direction} onChange={setDirection} />
            <CardCountsPanel
              counts={movementCounts}
              playerCount={setupPlayers.length}
              onChange={handleChangeCardCount}
              onReset={handleResetCardCounts}
            />
            <button
              className="primary-button"
              type="button"
              disabled={!canDealMovement(movementCounts, setupPlayers.length).ok}
              onClick={handleStartGame}
            >
              เริ่มเกม · สุ่มผู้เล่นคนแรก
            </button>
            {import.meta.env.DEV && (
              <DevScenarioPanel scenarios={DEV_SCENARIOS} onStart={handleStartScenario} />
            )}
          </div>
        </>
      )}

      {phase === 'direction' && (
        <TurnDirectionScreen
          firstPlayerName={players[firstPlayerIndex].name}
          selected={pendingTurnDirection}
          onSelect={setPendingTurnDirection}
          onConfirm={handleConfirmTurnDirection}
          onBack={handleBackToSetup}
        />
      )}

      {phase === 'obstacle-handoff' && (
        <ObstacleHandoffScreen
          playerName={players[obstaclePlayerIndex].name}
          obstacleCount={currentObstacleHand.length}
          step={obstacleTurn + 1}
          total={players.length}
          onStart={handleStartObstacleTurn}
        />
      )}

      {phase === 'obstacle' && (
        <>
          <Board
            robo={displayRobo}
            boardSize={boardSize}
            obstacles={placedObstacles}
            pendingCell={pendingCell}
            pendingTypeId={selectedObstacle ? selectedObstacle.typeId : null}
            onCellClick={handleObstacleCellClick}
          />
          <div className="side-stack">
            <ObstaclePlacementPanel
              playerName={players[obstaclePlayerIndex].name}
              step={obstacleTurn + 1}
              total={players.length}
              hand={currentObstacleHand}
              selectedUid={selectedObstacleUid}
              pendingCell={pendingCell}
              message={placementMessage}
              onSelect={setSelectedObstacleUid}
              onConfirm={handleConfirmPlaceObstacle}
              onFinish={handleFinishObstacleTurn}
              onResetGame={handleResetGame}
            />
          </div>
        </>
      )}

      {phase === 'board' && (
        <>
          <Board
            robo={displayRobo}
            boardSize={boardSize}
            obstacles={placedObstacles}
            warpOptions={pendingWarp ? pendingWarp.destinations : []}
          />
          <div className="side-stack">
            {import.meta.env.DEV && activeScenario && (
              <DevScenarioBanner
                scenario={activeScenario}
                onRestart={() => handleStartScenario(activeScenario)}
                onExit={handleExitScenario}
              />
            )}
            <TurnPanel
              players={players}
              currentIndex={currentIndex}
              turnOrder={getTurnOrder(firstPlayerIndex, players.length, turnDirectionInfo.step)}
              turnDirectionLabel={turnDirectionInfo.label}
              turnActive={turnActive}
              handOpen={handOpen}
              missionOpen={missionOpen}
              crashCount={crashCount}
              lastMove={lastMove}
              pendingWarp={pendingWarp}
              hand={cardState ? cardState.hands[currentIndex] : []}
              drawCount={cardState ? cardState.drawPile.length : 0}
              discardCount={cardState ? cardState.discardPile.length : 0}
              cardPlayed={cardPlayed}
              cardLog={cardLog}
              onStartTurn={handleStartTurn}
              onToggleHand={() => setHandOpen(!handOpen)}
              onToggleMission={() => setMissionOpen(!missionOpen)}
              onPlayCard={handlePlayCard}
              onChooseWarp={handleChooseWarp}
              onEndTurn={handleEndTurn}
              onResetGame={handleResetGame}
            />
          </div>
        </>
      )}

      {phase === 'handoff' && (
        <HandoffScreen
          nextPlayerName={players[currentIndex].name}
          onStartTurn={handleStartTurn}
        />
      )}

      {!isScreenMode && (
        <footer className="game-footer">
          <span>
            ROBO POSITION{' '}
            <strong>
              แถว {displayRobo.row + 1} · คอลัมน์ {displayRobo.col + 1}
              {displayRobo.row === startPosition.row && displayRobo.col === startPosition.col
                ? ' (START)'
                : ''}
            </strong>
          </span>
          <span>FACING <strong>{displayRobo.facing} {displayFacing.arrow}</strong></span>
          <span>CRASH <strong>{crashCount} / {CRASH_LIMIT}</strong></span>
        </footer>
      )}
    </main>
  )
}

export default App