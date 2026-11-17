// เครื่องมือทดสอบ (ชั่วคราว): สถานการณ์สำเร็จรูปสำหรับทดสอบบนหน้าจอ
// ใช้ได้เฉพาะตอนรัน npm run dev (App.jsx ตรวจ import.meta.env.DEV) ไม่ติดไปกับ build จริง
// ไม่เปลี่ยนกติกาเกม: แค่จัด State เริ่มต้น (ตำแหน่ง Robo + Obstacle + มือ/กองการ์ด) ไว้ให้
//
// M4.3 กลุ่ม 1: เหลือเฉพาะสถานการณ์ของงานที่กำลังทดสอบ (Virus ปรับการเดิน: ขาหัก / ขาหัก+ / ย้อนรอย / กระโดด)
// สถานการณ์ของ M4.2 (สลับใต้กอง / เติมมือ Virus) ถูกตัดออกแล้ว: ตรรกะล็อกไว้ใน tests/virus.mjs และอยู่ใน git commit c9afa9e
// (ส่วนของ M4.1 อยู่ใน commit 51dfb14, ส่วนของ Obstacle อยู่ใน commit 6e5ab5f)
//
// พิกัดที่เขียนในข้อความนับจาก 1 (แถว 1 = บนสุด) ตรงกับที่แสดงบนหน้าจอ
// พิกัดในข้อมูล (row, col) นับจาก 0 เหมือนในโค้ดเกม ทั้งหมดอยู่บนกระดาน 9x9 (Starting Point = แถว 5 · คอลัมน์ 5)
//
// ฟิลด์ของสถานการณ์:
//   playerCount (ไม่ระบุ = ใช้ผู้เล่นทั้งหมดที่ตั้งไว้ในหน้า Setup) / boardSize / robo / obstacles
//   cards: (ไม่บังคับ) การ์ด Movement { hands: [[typeId...] ต่อผู้เล่น], drawPile: [typeId...] (หัวอาร์เรย์ = ใบบนสุด), discardPile: [typeId...] }
//          ไม่ระบุ = ผู้เล่นทุกคนได้ Walk 4 ใบ กองจั่ว Walk 8 ใบ กองทิ้งว่าง / ผู้เล่นที่ไม่ได้ระบุมือจะได้ Walk 4 ใบ
//   virus: การ์ด Virus รูปแบบเดียวกับ cards (typeId ใช้ id จาก src/game/cards/virusCards.js)
//          ผู้เล่นที่ไม่ได้ระบุมือจะได้ ขาหัก (broken-leg) กับ แอนตี้ไวรัส (anti-virus)

const DEFAULT_MOVEMENT_HAND = ["walk", "walk", "walk", "walk"];
const DEFAULT_MOVEMENT_CARDS = {
  hands: [],
  drawPile: ["walk", "walk", "walk", "walk", "walk", "walk", "walk", "walk"],
  discardPile: [],
};
const DEFAULT_VIRUS_HAND = ["broken-leg", "anti-virus"];
const DEFAULT_VIRUS_CARDS = { hands: [], drawPile: [], discardPile: [] };

const WALK_PILE = [
  "walk",
  "walk",
  "walk",
  "walk",
  "walk",
  "walk",
  "walk",
  "walk",
];
const VIRUS_PILE = ["backtrack", "jump", "i-take", "loose-bolt"];

export const DEV_SCENARIOS = [
  {
    id: "virus-leg",
    title: "1. ขาหัก / ขาหัก+ (ติด Movement ใบถัดไป)",
    summary:
      "Player 1 แนบ ขาหัก กับ Walk++ → Movement ของตัวเองเดินเต็ม แต่ของ Player 2 โดนลด 1 ช่อง ส่วน ขาหัก+ ของ Player 2 ไปลด Player 1 ใบถัดไป 2 ช่อง (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 0, facing: "RIGHT" },
    obstacles: [],
    cards: {
      hands: [
        ["walk-plus-plus", "walk-plus-plus", "walk", "walk"],
        ["walk-plus-plus", "walk", "walk", "walk"],
      ],
      drawPile: WALK_PILE,
      discardPile: [],
    },
    virus: {
      hands: [
        ["broken-leg", "anti-virus"],
        ["broken-leg-plus", "genius"],
      ],
      drawPile: VIRUS_PILE,
      discardPile: [],
    },
    steps: [
      "กด เปิด Hand ของ Player 1 กดปุ่ม 'แนบกับ Movement ตานี้' ที่การ์ด ขาหัก (แอนตี้ไวรัส ยังใช้ไม่ได้) แล้วกดการ์ด Walk++",
      "กด จบตา แล้วกด เริ่มตา ของ Player 2 กด เปิด Hand แนบ ขาหัก+ แล้วเล่น Walk++",
      "กด จบตา แล้วกด เริ่มตา ของ Player 1 กด เปิด Hand และเล่น Walk++ (ไม่ต้องแนบ Virus)",
    ],
    expect: [
      "ข้อ 1: Robo เดินได้ 3 ช่องไปที่ แถว 5 · คอลัมน์ 4 (Movement ของคนแนบไม่โดน Virus ของตัวเอง) / ผลการเคลื่อนที่ไม่มีข้อความ Virus / กล่อง 'VIRUS ที่รอผล' ขึ้น ขาหัก · จาก Player 1 / แอนตี้ไวรัสไม่มีปุ่มแนบ และมีข้อความว่ายังใช้งานไม่ได้",
      "ข้อ 2: ตาของ Player 2 กล่อง VIRUS ที่รอผลมี ขาหัก · จาก Player 1 และ Virus ของ Player 1 ถูกจั่วเติมให้ครบ 2 ใบ (ล่าสุด: Player 1 จั่ว Virus เติมให้ครบ 2 ใบ) / หลังเล่น Walk++ ผลขึ้นว่า Virus ที่ทำงานกับ Movement นี้: ขาหัก (จาก Player 1) ลดระยะเดิน 1 ช่อง → ปรับเป็น เดิน 2 ช่อง · Robo ไปที่ แถว 5 · คอลัมน์ 6 / กล่องรอผลเปลี่ยนเป็น ขาหัก+ · จาก Player 2",
      "ข้อ 3: ผลขึ้นว่า ขาหัก+ (จาก Player 2) ลดระยะเดิน 2 ช่อง → ปรับเป็น เดิน 1 ช่อง · Robo ไปที่ แถว 5 · คอลัมน์ 7 / กล่อง VIRUS ที่รอผลว่าง (ไม่มี) / Walk++ ของข้อ 3 ไม่โดนซ้ำ",
    ],
  },
  {
    id: "virus-backtrack",
    title: "2. ย้อนรอย (หัน + ถอยหลัง)",
    summary:
      "Player 1 แนบ ย้อนรอย แล้ว Player 2 เล่น Turn Left+ → กลับด้านเป็น หันขวา + ถอยหลัง 1 ช่อง (ทิศหันคงตามที่หัน ไม่ใช่ทิศที่ถอย) (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [],
    cards: {
      hands: [
        ["walk", "walk", "walk-plus-plus", "walk"],
        ["turn-left-plus", "walk", "walk", "walk"],
      ],
      drawPile: WALK_PILE,
      discardPile: [],
    },
    virus: {
      hands: [
        ["backtrack", "jump"],
        ["genius", "i-take"],
      ],
      drawPile: VIRUS_PILE,
      discardPile: [],
    },
    steps: [
      "กด เปิด Hand ของ Player 1 กดปุ่ม 'แนบกับ Movement ตานี้' ที่การ์ด ย้อนรอย แล้วกดการ์ด Walk",
      "กด จบตา แล้วกด เริ่มตา ของ Player 2 กด เปิด Hand และเล่น Turn Left+ (ไม่ต้องแนบ Virus)",
      "กด จบตา แล้วกด เริ่มตา ของ Player 1 กด เปิด Hand และเล่น Walk++ (ไม่ต้องแนบ Virus)",
    ],
    expect: [
      "ข้อ 1: Robo เดินได้ 1 ช่องไปที่ แถว 5 · คอลัมน์ 6 หันไปทางขวา / กล่อง VIRUS ที่รอผลขึ้น ย้อนรอย · จาก Player 1",
      "ข้อ 2: ผลขึ้นว่า Virus ที่ทำงานกับ Movement นี้: ย้อนรอย (จาก Player 1) เปลี่ยนเป็นผลตรงข้าม → ปรับเป็น หันขวา + ถอยหลัง 1 ช่อง · Turn Left+: หันไปทางลง แล้วถอยหลัง 1 ช่อง / Robo หันไปทางลง และไปที่ แถว 4 · คอลัมน์ 6 (ถอยหลัง = ขยับขึ้น 1 ช่อง ทั้งที่หันลง) / กล่องรอผลว่าง",
      "ข้อ 3: Walk++ ปกติ ไม่มีข้อความ Virus: Robo ที่หันลงเดิน 3 ช่องไปที่ แถว 7 · คอลัมน์ 6",
    ],
  },
  {
    id: "virus-jump",
    title: "3. กระโดด (ข้ามช่อง / ลง Wall หยุดที่ช่องที่ข้าม)",
    summary:
      "Player 1 แนบ กระโดด แล้ว Player 2 เล่น Walk++ → กระโดดข้าม Scrap (ไม่ทำงาน) แต่ช่องที่จะลงถัดไปเป็น Wall จึงหยุดที่ช่องที่ข้าม (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 8, col: 6, facing: "UP" },
    obstacles: [
      { typeId: "scrap", row: 6, col: 6 },
      { typeId: "wall", row: 3, col: 6 },
    ],
    cards: {
      hands: [
        ["walk", "walk", "walk", "walk"],
        ["walk-plus-plus", "walk", "walk", "walk"],
      ],
      drawPile: WALK_PILE,
      discardPile: [],
    },
    virus: {
      hands: [
        ["jump", "anti-virus"],
        ["genius", "i-take"],
      ],
      drawPile: VIRUS_PILE,
      discardPile: [],
    },
    steps: [
      "กด เปิด Hand ของ Player 1 กดปุ่ม 'แนบกับ Movement ตานี้' ที่การ์ด กระโดด แล้วกดการ์ด Walk",
      "กด จบตา แล้วกด เริ่มตา ของ Player 2 กด เปิด Hand และเล่น Walk++ (ไม่ต้องแนบ Virus)",
    ],
    expect: [
      "ข้อ 1: Robo เดินได้ 1 ช่องไปที่ แถว 8 · คอลัมน์ 7 หันไปทางขึ้น (ก่อนถึง Scrap ที่ แถว 7 · คอลัมน์ 7) / กล่อง VIRUS ที่รอผลขึ้น กระโดด · จาก Player 1",
      "ข้อ 2: ผลขึ้นว่า Virus ที่ทำงานกับ Movement นี้: กระโดด (จาก Player 1) เดินแบบเว้นช่อง → ปรับเป็น กระโดด 3 ครั้ง (ข้ามทีละช่อง) · Walk++: ชน Wall · กระโดดได้ 1 ครั้ง แล้วหยุด (ช่องที่จะลงเป็น Wall จึงหยุดที่ช่องที่ข้าม) / Robo อยู่ที่ แถว 5 · คอลัมน์ 7 (ช่องใต้ Wall) / Scrap ที่ แถว 7 · คอลัมน์ 7 ไม่ทำงานเพราะถูกข้าม (ไม่ชำรุด ไม่มีข้อความ Scrap) / ไม่นับ Crash (ยังเป็น 0 / 3)",
    ],
  },
];

// แปลงรายการ Obstacle ของสถานการณ์เป็นรูปแบบเดียวกับที่ใช้บนกระดานจริง
// ({ uid, typeId, row, col, ownerIndex, damagedTurns })
export function buildScenarioObstacles(scenario) {
  return scenario.obstacles.map((item, index) => ({
    uid: `dev-${scenario.id}-${index}`,
    typeId: item.typeId,
    row: item.row,
    col: item.col,
    ownerIndex: 0,
    damagedTurns: item.damagedTurns ?? 0,
  }));
}

// สร้างสถานะการ์ด { drawPile, discardPile, hands } จากข้อมูล { hands, drawPile, discardPile } ของสถานการณ์
// (ไม่สับ — เรียงตามที่เขียนไว้) การ์ดแต่ละใบมี uid ไม่ซ้ำ เช่น "dev-virus-swap-card-0" หรือ "dev-virus-swap-virus-0"
function buildScenarioPiles(
  scenarioId,
  source,
  defaultHand,
  playerCount,
  label,
) {
  let counter = 0;
  const make = (typeId) => {
    const card = { uid: `dev-${scenarioId}-${label}-${counter}`, typeId };
    counter += 1;
    return card;
  };

  return {
    drawPile: source.drawPile.map(make),
    discardPile: source.discardPile.map(make),
    hands: Array.from({ length: playerCount }, (_, playerIndex) =>
      (source.hands[playerIndex] ?? defaultHand).map(make),
    ),
  };
}

// สถานะการ์ด Movement ของสถานการณ์ (ไม่ระบุ cards = ค่าเริ่มต้นด้านบน)
export function buildScenarioCardState(scenario, playerCount) {
  return buildScenarioPiles(
    scenario.id,
    scenario.cards ?? DEFAULT_MOVEMENT_CARDS,
    DEFAULT_MOVEMENT_HAND,
    playerCount,
    "card",
  );
}

// สถานะการ์ด Virus ของสถานการณ์ (ไม่ระบุ virus = มือค่าเริ่มต้น กองจั่ว/กองทิ้งว่าง)
export function buildScenarioVirusState(scenario, playerCount) {
  return buildScenarioPiles(
    scenario.id,
    scenario.virus ?? DEFAULT_VIRUS_CARDS,
    DEFAULT_VIRUS_HAND,
    playerCount,
    "virus",
  );
}
