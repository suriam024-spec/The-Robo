// M3.1 — ตรรกะการเคลื่อนที่ของ Robo (ฟังก์ชันคำนวณล้วน ไม่ผูกกับหน้าจอ)
//
// พิกัดใช้ row/col เริ่มนับจาก 0 (แถวบนสุด = 0, คอลัมน์ซ้ายสุด = 0)
// ทิศ: UP = แถวลดลง, DOWN = แถวเพิ่มขึ้น, LEFT = คอลัมน์ลดลง, RIGHT = คอลัมน์เพิ่มขึ้น

// เรียงตามเข็มนาฬิกา: หันขวา = ไปตัวถัดไป, หันซ้าย = ย้อนกลับ
export const FACINGS = ['UP', 'RIGHT', 'DOWN', 'LEFT']

const FACING_DELTAS = {
  UP: { row: -1, col: 0 },
  RIGHT: { row: 0, col: 1 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
}

// คำสั่งเคลื่อนที่ตามตาราง Movement Cards ใน GDD v0.2 หัวข้อ 19
// turn: NONE | LEFT | RIGHT | AROUND   steps: จำนวนช่องที่เดิน (หันก่อน แล้วค่อยเดิน)
export const MOVEMENT_COMMANDS = [
  { id: 'walk', label: 'Walk', turn: 'NONE', steps: 1 },
  { id: 'walk-plus', label: 'Walk+', turn: 'NONE', steps: 2 },
  { id: 'walk-plus-plus', label: 'Walk++', turn: 'NONE', steps: 3 },
  { id: 'turn-left', label: 'Turn Left', turn: 'LEFT', steps: 0 },
  { id: 'turn-left-plus', label: 'Turn Left+', turn: 'LEFT', steps: 1 },
  { id: 'turn-left-plus-plus', label: 'Turn Left++', turn: 'LEFT', steps: 2 },
  { id: 'turn-right', label: 'Turn Right', turn: 'RIGHT', steps: 0 },
  { id: 'turn-right-plus', label: 'Turn Right+', turn: 'RIGHT', steps: 1 },
  { id: 'turn-right-plus-plus', label: 'Turn Right++', turn: 'RIGHT', steps: 2 },
  { id: 'turn-around', label: 'Turn Around', turn: 'AROUND', steps: 0 },
]

// ตำแหน่ง Starting Point = ช่องกลางกระดาน (boardSize ต้องเป็นเลขคี่)
export function getStartPosition(boardSize) {
  const center = (boardSize - 1) / 2
  return { row: center, col: center }
}

// สร้าง Robo ใหม่ที่ Starting Point หันตามทิศที่กำหนด
export function createRobo(boardSize, facing) {
  const start = getStartPosition(boardSize)
  return { row: start.row, col: start.col, facing }
}

export function isInsideBoard(row, col, boardSize) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize
}

// คำนวณทิศใหม่หลังหัน (turn = NONE | LEFT | RIGHT | AROUND)
export function turnFacing(facing, turn) {
  const index = FACINGS.indexOf(facing)
  if (index === -1) {
    throw new Error(`Unknown facing: ${facing}`)
  }

  if (turn === 'NONE') return facing
  if (turn === 'RIGHT') return FACINGS[(index + 1) % FACINGS.length]
  if (turn === 'LEFT') return FACINGS[(index + FACINGS.length - 1) % FACINGS.length]
  if (turn === 'AROUND') return FACINGS[(index + 2) % FACINGS.length]

  throw new Error(`Unknown turn: ${turn}`)
}

// ทำตามคำสั่งหนึ่งคำสั่ง: หันก่อน แล้วเดินทีละช่องตามทิศที่หัน
// ถ้าก้าวออกนอกกระดาน → หยุดทันที (ก้าวที่เหลือยกเลิก), ตกแมพ (crashed = true),
// Robo กลับ Starting Point โดยคงทิศที่หันอยู่ ณ ตอนตก
//
// คืนค่า: { robo, crashed, stepsTaken, facingBefore, facingAfterTurn }
//   robo = สถานะ Robo ใหม่ (ไม่แก้ค่าของ robo เดิม)
//   stepsTaken = จำนวนก้าวที่เดินสำเร็จก่อนตกแมพหรือครบคำสั่ง
export function applyMovementCommand(robo, command, boardSize) {
  const steps = Math.max(0, Math.floor(command.steps))
  const facingAfterTurn = turnFacing(robo.facing, command.turn)
  const delta = FACING_DELTAS[facingAfterTurn]

  let row = robo.row
  let col = robo.col
  let stepsTaken = 0

  for (let step = 0; step < steps; step += 1) {
    const nextRow = row + delta.row
    const nextCol = col + delta.col

    if (!isInsideBoard(nextRow, nextCol, boardSize)) {
      const start = getStartPosition(boardSize)
      return {
        robo: { row: start.row, col: start.col, facing: facingAfterTurn },
        crashed: true,
        stepsTaken,
        facingBefore: robo.facing,
        facingAfterTurn,
      }
    }

    row = nextRow
    col = nextCol
    stepsTaken += 1
  }

  return {
    robo: { row, col, facing: facingAfterTurn },
    crashed: false,
    stepsTaken,
    facingBefore: robo.facing,
    facingAfterTurn,
  }
}