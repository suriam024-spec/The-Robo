// เครื่องมือทดสอบ (ชั่วคราว): สถานการณ์สำเร็จรูปสำหรับทดสอบบนหน้าจอ
// ใช้ได้เฉพาะตอนรัน npm run dev (App.jsx ตรวจ import.meta.env.DEV) ไม่ติดไปกับ build จริง
// ไม่เปลี่ยนกติกาเกม: แค่จัด State เริ่มต้น (ตำแหน่ง Robo + Obstacle + มือ/กองการ์ด) ไว้ให้
//
// M4.2: เหลือเฉพาะสถานการณ์ของงานที่กำลังทดสอบ (Virus Cards) — สถานการณ์ของ M4.1 ถูกตัดออกแล้ว
// (ตรรกะของการ์ด Movement ยังถูกล็อกไว้ด้วย tests/cards.mjs และอยู่ใน git commit 51dfb14
//  ส่วนตรรกะของ Obstacle ล็อกไว้ด้วย tests/*.mjs และอยู่ใน git commit 6e5ab5f)
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

export const DEV_SCENARIOS = [
  {
    id: "virus-swap",
    title: "1. สลับ Virus ใต้กอง (2 ตา)",
    summary:
      "กองจั่ว Virus เหลือ 1 ใบ สลับ 2 ครั้ง (ตาละ 1 ครั้ง) ใบแรกที่ใส่ใต้กองต้องกลับมาครั้งที่สอง (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [],
    virus: {
      hands: [
        ["broken-leg", "jump"],
        ["genius", "i-take"],
      ],
      drawPile: ["backtrack"],
      discardPile: [],
    },
    steps: [
      "กด เปิด Hand ของ Player 1 ดูการ์ด Virus ทั้ง 2 ใบ (ขาหัก กับ กระโดด) แล้วกดปุ่ม 'ใต้กอง + จั่วใหม่' ที่การ์ด ขาหัก",
      "กด จบตา แล้วกด เริ่มตา ของ Player 2 จากนั้นกด จบตา อีกครั้ง และกด เริ่มตา ของ Player 1 กลับมา (ไม่ต้องเล่นการ์ด Movement)",
      "กด เปิด Hand ของ Player 1 แล้วกดปุ่ม 'ใต้กอง + จั่วใหม่' ที่การ์ด ย้อนรอย (ใบที่เพิ่งจั่วมาเมื่อครั้งก่อน)",
    ],
    expect: [
      "ข้อ 1: Hand Virus ของ Player 1 เป็น กระโดด แล้วตามด้วย ย้อนรอย (ขาหักหายไปจากมือ) / ปุ่ม 'ใต้กอง + จั่วใหม่' ทุกใบกดไม่ได้ และมีข้อความว่าสลับแล้วในตานี้ / บรรทัดสถานะ Virus กองจั่ว 1 ใบ · กองทิ้ง 0 ใบ และมีข้อความล่าสุดว่า Player 1 สลับ Virus 1 ใบใต้กอง แล้วจั่วใหม่ 1 ใบ (ไม่บอกชื่อการ์ด)",
      "ข้อ 2: ตาของ Player 2 Hand Virus เป็น อัจฉริยะ! กับ ฉันขอละนะ (ไม่ใช่ใบของ Player 1) / ตอนกลับมาตา Player 1 ปุ่มสลับกดได้อีกครั้ง (ตาใหม่)",
      "ข้อ 3: Hand Virus ของ Player 1 เป็น กระโดด แล้วตามด้วย ขาหัก (ใบแรกที่ใส่ใต้กองกลับมาแล้ว) / กองจั่ว Virus ยังเป็น 1 ใบ (ย้อนรอยอยู่ใต้กอง) · กองทิ้ง 0 ใบ / ปุ่มสลับกดไม่ได้อีก",
    ],
  },
  {
    id: "virus-topup",
    title: "2. จบตาแล้วเติม Virus ให้ครบ 2",
    summary:
      "ผู้เล่นทั้งคู่มี Virus 1 ใบ จบตาแล้วระบบจั่วเติมให้ครบ 2 ใบ ครั้งที่สองกองจั่วหมดต้องสับกองทิ้ง (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [],
    virus: {
      hands: [["jump"], ["genius"]],
      drawPile: ["backtrack"],
      discardPile: ["anti-virus", "loose-bolt"],
    },
    steps: [
      "กด เปิด Hand ของ Player 1: Virus มีใบเดียว (กระโดด) ดูว่าปุ่ม 'ใต้กอง + จั่วใหม่' กดได้หรือไม่",
      "กด จบตา แล้วกด เริ่มตา ของ Player 2 ดูบรรทัดสถานะ แล้วกด เปิด Hand ของ Player 2 (มี อัจฉริยะ! ใบเดียว)",
      "กด จบตา ของ Player 2 แล้วกด เริ่มตา ของ Player 1 ดูบรรทัดสถานะ และกด เปิด Hand ของ Player 1",
    ],
    expect: [
      "ข้อ 1: Virus Cards (1) และปุ่มสลับกดไม่ได้ มีข้อความว่าสลับใต้กองได้เฉพาะตอนมี Virus ครบ 2 ใบ",
      "ข้อ 2: ตาของ Player 2 บรรทัดสถานะ Virus กองจั่ว 0 ใบ · กองทิ้ง 2 ใบ และล่าสุด: Player 1 จั่ว Virus เติมให้ครบ 2 ใบ (จั่ว 1 ใบ) / Hand ของ Player 2 มี Virus 1 ใบ ปุ่มสลับกดไม่ได้",
      "ข้อ 3: บรรทัดสถานะ Virus กองจั่ว 1 ใบ · กองทิ้ง 0 ใบ และล่าสุด: Player 2 จั่ว Virus เติมให้ครบ 2 ใบ (จั่ว 1 ใบ · สับกองทิ้งเป็นกองจั่วใหม่) / Hand Virus ของ Player 1 เป็น กระโดด แล้วตามด้วย ย้อนรอย (2 ใบ)",
    ],
  },
  {
    id: "virus-reshuffle",
    title: "3. กองจั่ว Virus ว่าง แล้วสลับใต้กอง",
    summary:
      "กองจั่ว Virus ว่าง กองทิ้งมี 3 ใบ ตอนสลับใต้กองต้องสับกองทิ้งเป็นกองจั่วก่อน (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [],
    virus: {
      hands: [
        ["broken-leg", "jump"],
        ["genius", "i-take"],
      ],
      drawPile: [],
      discardPile: ["backtrack", "anti-virus", "loose-bolt"],
    },
    steps: [
      "กด เปิด Hand ของ Player 1 ดูบรรทัดสถานะก่อนกด (กองจั่ว Virus ว่าง) แล้วกดปุ่ม 'ใต้กอง + จั่วใหม่' ที่การ์ด ขาหัก",
    ],
    expect: [
      "ก่อนกด: บรรทัดสถานะ Virus กองจั่ว 0 ใบ · กองทิ้ง 3 ใบ",
      "หลังกด: บรรทัดสถานะ Virus กองจั่ว 3 ใบ · กองทิ้ง 0 ใบ และล่าสุด: Player 1 สลับ Virus 1 ใบใต้กอง แล้วจั่วใหม่ 1 ใบ (สับกองทิ้งเป็นกองจั่วใหม่) / Hand Virus ของ Player 1 เป็น กระโดด แล้วตามด้วยการ์ดใบใหม่ 1 ใบซึ่งเป็นหนึ่งใน ย้อนรอย / แอนตี้ไวรัส / น็อตหลุด (สุ่ม) และต้องไม่ใช่ ขาหัก / ปุ่มสลับกดไม่ได้อีก",
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
