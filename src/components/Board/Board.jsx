// กระดานเกม: วาดช่อง Starting Point / Locked Zone / Robo / ป้าย Obstacle (รวมสถานะชำรุด) และ Legend
// รับ onCellClick เมื่อใช้เลือกช่องตอนวาง Obstacle และ warpOptions เมื่อเลือกปลายทางของ The Hole
import { OBSTACLE_MARKS } from '../../data/constants.js'
import { getObstacleType, isDamaged } from '../../game/obstacles/obstacles.js'
import { getDirectionInfo } from '../../utils/describe.js'

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
function ObstacleToken({ typeId, preview = false, damaged = false }) {
  const type = getObstacleType(typeId)
  if (!type) return null

  return (
    <span
      className={`obstacle-token ${preview ? 'preview' : ''} ${damaged ? 'damaged' : ''}`}
      title={damaged ? `${type.label} (ชำรุด)` : type.label}
    >
      <span className="obstacle-short">{type.short}</span>
      <span className="obstacle-mark" aria-hidden="true">{OBSTACLE_MARKS[typeId]}</span>
    </span>
  )
}

function Board({
  robo,
  boardSize,
  obstacles = [],
  pendingCell = null,
  pendingTypeId = null,
  warpOptions = [],
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
            const isWarpOption = warpOptions.some((item) => item.row === row && item.col === col)
            const isObstacleDamaged = obstacle ? isDamaged(obstacle) : false

            let cellLabel = `ช่องแถวที่ ${row + 1} คอลัมน์ที่ ${col + 1}`
            if (isRoboCell) {
              cellLabel = `Robo อยู่ที่แถวที่ ${row + 1} คอลัมน์ที่ ${col + 1} หันไปทาง${selectedDirection.label}`
            } else if (isStartCell) {
              cellLabel = 'จุดเริ่มต้น (Starting Point)'
            } else if (cellType === 'locked-zone') {
              cellLabel = 'เขตล็อก'
            }
            if (obstacleType) {
              cellLabel = `${cellLabel} มี ${obstacleType.label}${isObstacleDamaged ? ' (ชำรุด)' : ''}`
            }
            if (isWarpOption) {
              cellLabel = `${cellLabel} (ปลายทางที่เลือกวาร์ปได้)`
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
              isWarpOption ? 'warp-option' : '',
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
                {obstacle && (
                  <ObstacleToken typeId={obstacle.typeId} damaged={isObstacleDamaged} />
                )}
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
        <div className="legend-item">
          <span className="legend-swatch damaged-swatch">Ob</span>
          <span>Obstacle ชำรุด (ไม่ทำงานชั่วคราว)</span>
        </div>
      </div>
    </section>
  )
}

export default Board