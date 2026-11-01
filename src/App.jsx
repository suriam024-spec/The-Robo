import { useState } from 'react'
import './App.css'
import {
  MOVEMENT_COMMANDS,
  applyMovementCommand,
  createRobo,
  getStartPosition,
} from './game/movement/movement.js'
import {
  canPlaceObstacle,
  dealObstacles,
  getObstacleType,
  placeObstacle,
} from './game/obstacles/obstacles.js'

const BOARD_SIZES = [9, 11, 13]
const DEFAULT_BOARD_SIZE = 9

const MIN_PLAYERS = 2
const MAX_PLAYERS = 6
const DEFAULT_PLAYER_COUNT = 4
const MAX_NAME_LENGTH = 16
const CRASH_LIMIT = 3 // M3: แสดงผลอย่างเดียว ยังไม่มีผลต่อการจบเกม

// ตัวย่อสั้นมาก ใช้แทนชื่อบนกระดานเมื่อช่องเล็กจนอ่านชื่อเต็มไม่ได้ (เช่น 13x13 บนมือถือ)
const OBSTACLE_MARKS = {
  wall: 'W',
  oil: 'O',
  scrap: 'Sc',
  hole: 'H',
  magnet: 'M',
  destroyer: 'D',
  spring: 'Sp',
  booster: 'B',
  'booster-plus': 'B+',
  shuffler: 'Sh',
  reset: 'R',
  'blue-screen': 'Bs',
  protect: 'P',
  support: 'Su',
}

const DIRECTIONS = [
  { id: 'UP', label: 'ขึ้น', arrow: '↑' },
  { id: 'RIGHT', label: 'ขวา', arrow: '→' },
  { id: 'DOWN', label: 'ลง', arrow: '↓' },
  { id: 'LEFT', label: 'ซ้าย', arrow: '←' },
]

// ทิศทางการวนของเกม: วนขวา = ไล่ตามรายชื่อ, วนซ้าย = ไล่ย้อนรายชื่อ
const TURN_DIRECTIONS = [
  {
    id: 'RIGHT',
    label: 'วนขวา',
    arrow: '↻',
    hint: 'ไล่ตามรายชื่อ 1 → 2 → 3 → …',
    step: 1,
  },
  {
    id: 'LEFT',
    label: 'วนซ้าย',
    arrow: '↺',
    hint: 'ไล่ย้อนรายชื่อ … → 3 → 2 → 1',
    step: -1,
  },
]

// ข้อมูลทดสอบชั่วคราว (Placeholder) — ยังไม่มีระบบทำงานจริงของการ์ด
const MOVEMENT_PLACEHOLDERS = [
  'Walk',
  'Walk+',
  'Walk++',
  'Turn Left',
  'Turn Left+',
  'Turn Right',
  'Turn Right+',
  'Turn Around',
]
const VIRUS_PLACEHOLDERS = [
  'ขาหัก',
  'แอนตี้ไวรัส',
  'กระโดด',
  'น็อตหลุด',
  'ย้อนรอย',
  'อัจฉริยะ!',
]
const MISSION_PLACEHOLDERS = [
  'หุ่นยนต์ตกแมพ 2 ครั้ง',
  'Oil Master',
  'Straight Line',
  'Wall Bumper',
  'Return Home',
  'Chaos',
]

function pickCycle(pool, start, count) {
  return Array.from({ length: count }, (_, k) => pool[(start + k) % pool.length])
}

function dealPlaceholders(playerIndex) {
  return {
    movementCards: pickCycle(MOVEMENT_PLACEHOLDERS, playerIndex * 2, 4),
    virusCards: pickCycle(VIRUS_PLACEHOLDERS, playerIndex * 2, 2),
    mission: MISSION_PLACEHOLDERS[playerIndex % MISSION_PLACEHOLDERS.length],
  }
}

function createDefaultSetupPlayers() {
  return Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, index) => ({
    id: index + 1,
    name: `Player ${index + 1}`,
  }))
}

function getNextIndex(currentIndex, playerCount, step) {
  return (currentIndex + step + playerCount) % playerCount
}

function getTurnOrder(firstIndex, playerCount, step) {
  return Array.from(
    { length: playerCount },
    (_, k) => (firstIndex + step * k + playerCount) % playerCount,
  )
}

function getDirectionInfo(facing) {
  return DIRECTIONS.find((item) => item.id === facing)
}

// อธิบายคำสั่งเคลื่อนที่เป็นภาษาไทย เช่น "หันซ้าย + เดิน 1 ช่อง"
function describeCommand(command) {
  const turnText = {
    NONE: '',
    LEFT: 'หันซ้าย',
    RIGHT: 'หันขวา',
    AROUND: 'กลับหลังหัน',
  }[command.turn]
  const stepText = command.steps > 0 ? `เดิน ${command.steps} ช่อง` : ''
  return [turnText, stepText].filter(Boolean).join(' + ')
}

// สรุปผลการเคลื่อนที่ครั้งล่าสุดเป็นข้อความ
function describeLastMove(lastMove) {
  if (!lastMove) return 'ยังไม่ได้สั่งเคลื่อนที่'
  const facingText = getDirectionInfo(lastMove.facingAfterTurn).label
  if (lastMove.crashed) {
    return `${lastMove.label}: เดินได้ ${lastMove.stepsTaken} ช่อง แล้วตกแมพ! Crash +1 · Robo กลับ Starting Point โดยหันไปทาง${facingText}`
  }
  if (lastMove.blocked) {
    return `${lastMove.label}: ชน Wall · เดินได้ ${lastMove.stepsTaken} ช่อง แล้วหยุด · หันไปทาง${facingText}`
  }
  if (lastMove.steps === 0) {
    return `${lastMove.label}: หันไปทาง${facingText}`
  }
  return `${lastMove.label}: หันไปทาง${facingText} แล้วเดิน ${lastMove.stepsTaken} ช่อง`
}

function getCellType(row, col, boardSize) {
  const center = (boardSize - 1) / 2
  if (row === center && col === center) return 'starting-point'
  if (Math.abs(row - center) <= 1 && Math.abs(col - center) <= 1) {
    return 'locked-zone'
  }
  return 'normal'
}

/* ---------- Board (M1 — ไม่เปลี่ยนพฤติกรรม) ---------- */

// ป้าย Obstacle บนกระดาน (M3.2: แสดงผลอย่างเดียว ยังไม่มีผลต่อ Robo)
function ObstacleToken({ typeId, preview = false }) {
  const type = getObstacleType(typeId)
  if (!type) return null

  return (
    <span className={`obstacle-token ${preview ? 'preview' : ''}`} title={type.label}>
      <span className="obstacle-short">{type.short}</span>
      <span className="obstacle-mark" aria-hidden="true">{OBSTACLE_MARKS[typeId]}</span>
    </span>
  )
}

function BoardSection({
  robo,
  boardSize,
  obstacles = [],
  pendingCell = null,
  pendingTypeId = null,
  onCellClick = null,
}) {
  const selectedDirection = getDirectionInfo(robo.facing)
  const totalCells = boardSize * boardSize
  const obstacleByCell = new Map(
    obstacles.map((item) => [`${item.row},${item.col}`, item]),
  )

  return (
    <section className="board-section" aria-labelledby="board-title">
      <div className="board-heading">
        <div>
          <span className="step-label">THE ARENA</span>
          <h2 id="board-title">สนามแข่งขัน</h2>
        </div>
        <div className="board-size">
          {boardSize} × {boardSize} <span>· {totalCells} ช่อง</span>
        </div>
      </div>

      <div className="board-frame">
        <div
          className="board"
          role="grid"
          aria-label={`กระดานเกมขนาด ${boardSize} คูณ ${boardSize}`}
          style={{ '--board-size': boardSize }}
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const row = Math.floor(index / boardSize)
            const col = index % boardSize
            const cellType = getCellType(row, col, boardSize)
            const isStartCell = cellType === 'starting-point'
            const isRoboCell = row === robo.row && col === robo.col
            const obstacle = obstacleByCell.get(`${row},${col}`)
            const obstacleType = obstacle ? getObstacleType(obstacle.typeId) : null
            const isPending = pendingCell?.row === row && pendingCell?.col === col

            let cellLabel = `ช่องแถวที่ ${row + 1} คอลัมน์ที่ ${col + 1}`
            if (isRoboCell) {
              cellLabel = `Robo อยู่ที่แถวที่ ${row + 1} คอลัมน์ที่ ${col + 1} หันไปทาง${selectedDirection.label}`
            } else if (isStartCell) {
              cellLabel = 'จุดเริ่มต้น (Starting Point)'
            } else if (cellType === 'locked-zone') {
              cellLabel = 'เขตล็อก'
            }
            if (obstacleType) {
              cellLabel = `${cellLabel} มี ${obstacleType.label}`
            }
            if (isPending) {
              cellLabel = `${cellLabel} (ช่องที่เลือกวาง)`
            }

            const interactiveProps = onCellClick
              ? {
                  tabIndex: 0,
                  onClick: () => onCellClick(row, col),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onCellClick(row, col)
                    }
                  },
                }
              : {}

            const cellClasses = [
              'cell',
              cellType,
              isRoboCell ? 'has-robo' : '',
              obstacle ? 'has-obstacle' : '',
              onCellClick ? 'placeable' : '',
              isPending ? 'pending' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                className={cellClasses}
                key={index}
                role="gridcell"
                aria-label={cellLabel}
                {...interactiveProps}
              >
                {isRoboCell && (
                  <div className="robo-token" title={`Robo หันไปทาง${selectedDirection.label}`}>
                    <span className="robo-arrow" aria-hidden="true">{selectedDirection.arrow}</span>
                    <span className="robo-label">ROBO</span>
                  </div>
                )}
                {cellType === 'locked-zone' && !isRoboCell && (
                  <span className="lock-mark" aria-label="ล็อก">✦</span>
                )}
                {isStartCell && <span className="start-label">START</span>}
                {obstacle && <ObstacleToken typeId={obstacle.typeId} />}
                {isPending && !obstacle && pendingTypeId && (
                  <ObstacleToken typeId={pendingTypeId} preview />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="board-legend" aria-label="คำอธิบายสัญลักษณ์">
        <div className="legend-item">
          <span className="legend-swatch start-swatch"><span>↑</span></span>
          <span>จุดเริ่มต้นและตำแหน่ง Robo</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch locked-swatch">✦</span>
          <span>Locked Zone</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch normal-swatch" />
          <span>พื้นที่สนาม</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch obstacle-swatch">Ob</span>
          <span>Obstacle (ตัวย่อชื่อชนิด)</span>
        </div>
      </div>
    </section>
  )
}

function BoardSizePanel({ boardSize, onChange }) {
  return (
    <section className="setup-panel" aria-labelledby="board-size-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 02</span>
        <h2 id="board-size-title">เลือกขนาดกระดาน</h2>
        <p>Starting Point จะอยู่กึ่งกลางกระดานเสมอ เปลี่ยนขนาดไม่ได้หลังเริ่มเกม</p>
      </div>

      <div className="size-picker" role="group" aria-label="เลือกขนาดกระดาน">
        {BOARD_SIZES.map((size) => (
          <button
            className={`direction-button size-button ${boardSize === size ? 'selected' : ''}`}
            key={size}
            type="button"
            aria-pressed={boardSize === size}
            onClick={() => onChange(size)}
          >
            <span className="size-value">{size}×{size}</span>
            <span className="size-cells">{size * size} ช่อง</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function RoboDirectionPanel({ direction, onChange }) {
  return (
    <section className="setup-panel" aria-labelledby="direction-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 03</span>
        <h2 id="direction-title">เลือกทิศเริ่มต้นของ Robo</h2>
        <p>Robo จะเริ่มต้นที่จุดกึ่งกลางกระดาน โดยหันไปตามทิศที่เลือก</p>
      </div>

      <div className="direction-picker" role="group" aria-label="เลือกทิศเริ่มต้น">
        {DIRECTIONS.map((item) => (
          <button
            className={`direction-button ${direction === item.id ? 'selected' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={direction === item.id}
            onClick={() => onChange(item.id)}
          >
            <span className="direction-arrow" aria-hidden="true">{item.arrow}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

/* ---------- M3.1: แผงทดสอบการเคลื่อนที่ (ชั่วคราว ลบเมื่อทำ M4 เสร็จ) ---------- */

function MovementTestPanel({ crashCount, lastMove, onMove }) {
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

      <div className="test-command-grid">
        {MOVEMENT_COMMANDS.map((command) => (
          <button
            className="test-command-button"
            key={command.id}
            type="button"
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

/* ---------- M2: Player Setup ---------- */

function PlayerSetupPanel({ players, onAdd, onRemove, onRename }) {
  return (
    <section className="setup-panel player-setup" aria-labelledby="players-title">
      <div className="setup-copy">
        <span className="step-label">GAME SETUP · 01</span>
        <h2 id="players-title">ผู้เล่น</h2>
        <p>รองรับ 2–6 คน แก้ไขชื่อได้ตามต้องการ</p>
      </div>

      <div className="player-count">
        <button
          className="count-button"
          type="button"
          aria-label="ลบผู้เล่น"
          disabled={players.length <= MIN_PLAYERS}
          onClick={onRemove}
        >
          −
        </button>
        <div className="count-value" aria-live="polite">
          <strong>{players.length}</strong>
          <span>คน</span>
        </div>
        <button
          className="count-button"
          type="button"
          aria-label="เพิ่มผู้เล่น"
          disabled={players.length >= MAX_PLAYERS}
          onClick={onAdd}
        >
          +
        </button>
      </div>

      <ul className="player-list">
        {players.map((player, index) => (
          <li className="player-row" key={player.id}>
            <span className="player-badge">{index + 1}</span>
            <input
              className="player-input"
              type="text"
              value={player.name}
              maxLength={MAX_NAME_LENGTH}
              aria-label={`ชื่อผู้เล่นคนที่ ${index + 1}`}
              onChange={(event) => onRename(player.id, event.target.value)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- M2: เลือกทิศทางการวน ---------- */

function TurnDirectionScreen({ firstPlayerName, selected, onSelect, onConfirm, onBack }) {
  return (
    <section className="screen-card" aria-labelledby="turn-direction-title">
      <span className="step-label">GAME SETUP · 04</span>
      <h2 id="turn-direction-title">
        ผู้เล่นคนแรกคือ <span className="highlight-name">{firstPlayerName}</span>
      </h2>
      <p className="screen-text">
        ให้ {firstPlayerName} เลือกทิศทางการวนของเกม ผู้เล่นคนอื่นจะเล่นตามลำดับที่เกิดขึ้น
      </p>

      <div className="turn-direction-picker" role="group" aria-label="เลือกทิศทางการวน">
        {TURN_DIRECTIONS.map((item) => (
          <button
            className={`turn-direction-button ${selected === item.id ? 'selected' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={selected === item.id}
            onClick={() => onSelect(item.id)}
          >
            <span className="turn-direction-arrow" aria-hidden="true">{item.arrow}</span>
            <span className="turn-direction-label">{item.label}</span>
            <span className="turn-direction-hint">{item.hint}</span>
          </button>
        ))}
      </div>

      <div className="screen-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          ← กลับไปตั้งค่าผู้เล่น
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={!selected}
          onClick={onConfirm}
        >
          ยืนยันและไปวาง Obstacle
        </button>
      </div>
    </section>
  )
}

/* ---------- M2: Handoff ---------- */

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

/* ---------- M2: แผงตาของผู้เล่น (หน้า Board) ---------- */

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
  onStartTurn,
  onToggleHand,
  onToggleMission,
  onMove,
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

          <MovementTestPanel crashCount={crashCount} lastMove={lastMove} onMove={onMove} />

          <button className="primary-button end-turn-button" type="button" onClick={onEndTurn}>
            จบตา · ส่งต่อผู้เล่นถัดไป
          </button>
        </div>
      )}

      <button className="text-button" type="button" onClick={onResetGame}>
        รีเซ็ตเกม (กลับไปตั้งค่าผู้เล่น)
      </button>
    </section>
  )
}

/* ---------- M3.2: Handoff ก่อนวาง Obstacle ---------- */

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

/* ---------- M3.2: แผงวาง Obstacle (หน้า Board) ---------- */

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

/* ---------- App ---------- */

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
  }

  function handleMove(commandId) {
    const command = MOVEMENT_COMMANDS.find((item) => item.id === commandId)
    if (!command) return

    const result = applyMovementCommand(robo, command, boardSize, placedObstacles)
    setRobo(result.robo)
    if (result.crashed) {
      setCrashCount(crashCount + 1)
    }
    setLastMove({
      label: command.label,
      steps: command.steps,
      stepsTaken: result.stepsTaken,
      crashed: result.crashed,
      blocked: result.blocked,
      facingAfterTurn: result.facingAfterTurn,
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
    const step = turnDirectionInfo.step
    setTurnActive(false)
    hidePrivateInfo()
    setCurrentIndex(getNextIndex(currentIndex, players.length, step))
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
          <BoardSection robo={displayRobo} boardSize={boardSize} obstacles={placedObstacles} />
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
          <BoardSection
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
          <BoardSection robo={displayRobo} boardSize={boardSize} obstacles={placedObstacles} />
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
              onStartTurn={handleStartTurn}
              onToggleHand={() => setHandOpen(!handOpen)}
              onToggleMission={() => setMissionOpen(!missionOpen)}
              onMove={handleMove}
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