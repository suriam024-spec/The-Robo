import { useState } from 'react'
import './styles/main.css'
import Board from './components/Board/Board.jsx'
import BoardSizePanel from './components/Board/BoardSizePanel.jsx'
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
import { dealPlaceholders } from './data/placeholders.js'
import {
  MOVEMENT_COMMANDS,
  applyMovementCommand,
  completeHoleWarp,
  createRobo,
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
import { createDefaultSetupPlayers, getNextIndex, getTurnOrder } from './game/players.js'
import { getDirectionInfo } from './utils/describe.js'

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

  // Obstacle Setup (M3.2)
  const [obstacleHands, setObstacleHands] = useState([]) // มือที่เหลือของผู้เล่นแต่ละคน
  const [placedObstacles, setPlacedObstacles] = useState([])
  const [obstacleTurn, setObstacleTurn] = useState(0) // ลำดับที่ในรอบวาง (0 = คนแรก)
  const [selectedObstacleUid, setSelectedObstacleUid] = useState(null)
  const [pendingCell, setPendingCell] = useState(null)
  const [placementMessage, setPlacementMessage] = useState('')

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

  function resetRobo() {
    setRobo(createRobo(boardSize, direction))
    setCrashCount(0)
    setLastMove(null)
    setPendingWarp(null)
  }

  // ทำให้ Obstacle uid นี้ชำรุดตามระยะของชนิดมัน (ถ้าชนิดนั้นไม่มีระบบชำรุด จะไม่เปลี่ยนอะไร)
  function damagePlacedObstacle(obstacles, uid) {
    const target = obstacles.find((item) => item.uid === uid)
    if (!target) return obstacles
    return damageObstacle(obstacles, uid, getDamageDuration(target.typeId))
  }

  function handleMove(commandId) {
    const command = MOVEMENT_COMMANDS.find((item) => item.id === commandId)
    if (!command) return

    if (pendingWarp) return // ต้องเลือกปลายทางของ Hole ให้เสร็จก่อน

    const result = applyMovementCommand(robo, command, boardSize, placedObstacles)
    setRobo(result.robo)
    if (result.crashed) {
      setCrashCount(crashCount + 1)
    }
    if (result.damageUid) {
      setPlacedObstacles(damagePlacedObstacle(placedObstacles, result.damageUid))
    }
    setPendingWarp(result.pendingWarp)
    setLastMove({
      label: command.label,
      steps: command.steps,
      stepsTaken: result.stepsTaken,
      crashed: result.crashed,
      blocked: result.blocked,
      returnedToStart: result.returnedToStart,
      warp: result.warp,
      pendingWarp: Boolean(result.pendingWarp),
      facingAfterTurn: result.facingAfterTurn,
    })
  }

  function handleChooseWarp(destinationUid) {
    if (!pendingWarp) return

    const done = completeHoleWarp(robo, pendingWarp, destinationUid)
    setRobo(done.robo)
    setPlacedObstacles(damagePlacedObstacle(placedObstacles, done.damageUid))
    setPendingWarp(null)
    setLastMove({ ...lastMove, pendingWarp: false, warp: done.warp })
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
    const readyPlayers = setupPlayers.map((player, index) => ({
      id: player.id,
      name: player.name.trim() || `Player ${index + 1}`,
      ...dealPlaceholders(index),
    }))
    const randomFirst = Math.floor(Math.random() * readyPlayers.length)

    resetRobo()
    resetObstacles()
    setPlayers(readyPlayers)
    setFirstPlayerIndex(randomFirst)
    setCurrentIndex(randomFirst)
    setPendingTurnDirection(null)
    setTurnActive(false)
    hidePrivateInfo()
    setPhase('direction')
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
    setTurnActive(true)
    setPhase('board')
  }

  function handleEndTurn() {
    if (pendingWarp) return // ต้องเลือกปลายทางของ Hole ก่อนจบตา

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
            <button className="primary-button" type="button" onClick={handleStartGame}>
              เริ่มเกม · สุ่มผู้เล่นคนแรก
            </button>
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
              onStartTurn={handleStartTurn}
              onToggleHand={() => setHandOpen(!handOpen)}
              onToggleMission={() => setMissionOpen(!missionOpen)}
              onMove={handleMove}
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