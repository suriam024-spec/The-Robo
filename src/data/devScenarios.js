// เครื่องมือทดสอบ (ชั่วคราว): สถานการณ์สำเร็จรูปสำหรับทดสอบบนหน้าจอ
// ใช้ได้เฉพาะตอนรัน npm run dev (App.jsx ตรวจ import.meta.env.DEV) ไม่ติดไปกับ build จริง
// ไม่เปลี่ยนกติกาเกม: แค่จัด State เริ่มต้น (ตำแหน่ง Robo + Obstacle + มือ/กองการ์ด) ไว้ให้
//
// M4.1: เหลือเฉพาะสถานการณ์ของงานที่กำลังทดสอบ (ระบบการ์ด) — สถานการณ์ Obstacle ที่ผ่านแล้วถูกตัดออก
// (ตรรกะของ Obstacle ยังถูกล็อกไว้ด้วย tests/*.mjs และอยู่ใน git commit 6e5ab5f)
//
// พิกัดที่เขียนในข้อความนับจาก 1 (แถว 1 = บนสุด) ตรงกับที่แสดงบนหน้าจอ
// พิกัดในข้อมูล (row, col) นับจาก 0 เหมือนในโค้ดเกม ทั้งหมดอยู่บนกระดาน 9x9 (Starting Point = แถว 5 · คอลัมน์ 5)
//
// ฟิลด์ของสถานการณ์:
//   playerCount (ไม่ระบุ = ใช้ผู้เล่นทั้งหมดที่ตั้งไว้ในหน้า Setup) / boardSize / robo / obstacles
//   cards: { hands: [[typeId...] ต่อผู้เล่น], drawPile: [typeId...] (หัวอาร์เรย์ = ใบบนสุด), discardPile: [typeId...] }
//          ผู้เล่นที่ไม่ได้ระบุมือจะได้ Walk 4 ใบ

export const DEV_SCENARIOS = [
  {
    id: "card-play",
    title: "1. เล่นการ์ด Movement",
    summary:
      "เล่นการ์ดจากมือ Robo เดินตามชนิดการ์ด การ์ดไปกองทิ้ง (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [],
    cards: {
      hands: [
        ["walk-plus", "turn-left-plus", "turn-around", "walk"],
        ["turn-right-plus", "walk", "walk", "walk"],
      ],
      drawPile: [
        "walk",
        "walk",
        "walk-plus",
        "turn-left",
        "turn-right",
        "turn-around",
      ],
      discardPile: [],
    },
    steps: [
      "กด เปิด Hand แล้วกดการ์ด Walk+ (หลังเล่นแล้วการ์ดทุกใบจะกดไม่ได้จนถึงตาถัดไป)",
      "กด จบตา แล้วกด เริ่มตา ของ Player 2 ในหน้าส่งต่อ",
      "กด เปิด Hand แล้วกดการ์ด Turn Right+",
    ],
    expect: [
      "ข้อ 1: Robo เดินขึ้น 2 ช่องไปที่ แถว 3 · คอลัมน์ 5 ยังหันขึ้น ข้อความผลบอก Walk+ แล้วเดิน 2 ช่อง / Hand เหลือ 3 ใบ (ไม่มี Walk+ แล้ว) และการ์ดอื่นกดไม่ได้ / บรรทัดสถานะบอก กองจั่ว 6 ใบ · กองทิ้ง 1 ใบ",
      "ข้อ 2: ตาของ Player 2 Hand ของ Player 2 มี 4 ใบ (Turn Right+, Walk, Walk, Walk) ไม่ใช่ใบของ Player 1 / กองทิ้ง 1 ใบ",
      "ข้อ 3: Robo หันขวาแล้วเดิน 1 ช่องไปที่ แถว 3 · คอลัมน์ 6 / Hand เหลือ 3 ใบ / กองจั่ว 6 ใบ · กองทิ้ง 2 ใบ Crash เป็น 0 / 3 ตลอด",
    ],
  },
  {
    id: "card-refill",
    title: "2. มือหมดแล้วเติมมือ",
    summary:
      "มือเหลือ 1 ใบ เล่นแล้วมือหมด จบตาแล้วเติมครบ 4 ใบ (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [],
    cards: {
      hands: [["walk"], ["walk", "walk", "walk", "walk"]],
      drawPile: [
        "walk-plus",
        "turn-left",
        "turn-right",
        "turn-around",
        "walk",
        "walk-plus-plus",
      ],
      discardPile: [],
    },
    steps: [
      "กด เปิด Hand: Player 1 มีการ์ดใบเดียว (Walk) แล้วกดเล่น",
      "กด จบตา (ระบบเติมมือให้ Player 1 ทันทีที่จบตา) แล้วกด เริ่มตา ของ Player 2 ดูบรรทัดสถานะ",
      "กด จบตา ของ Player 2 (ไม่ต้องเล่นการ์ดก็ได้) แล้วกด เริ่มตา ของ Player 1 และกด เปิด Hand",
    ],
    expect: [
      "ข้อ 1: Robo เดินขึ้น 1 ช่องไปที่ แถว 4 · คอลัมน์ 5 / Hand ของ Player 1 ว่าง (0 ใบ) และมีข้อความบอกว่ามือว่าง จะเติมเมื่อจบตา / กองทิ้ง 1 ใบ",
      "ข้อ 2: ตาของ Player 2 บรรทัดสถานะเป็น กองจั่ว 2 ใบ · กองทิ้ง 1 ใบ · ล่าสุด: Player 1 มือหมด เติมมือ 4 ใบ (ไม่มีคำว่าสับกองทิ้ง เพราะกองจั่วพอ)",
      "ข้อ 3: Hand ของ Player 1 มี 4 ใบตามลำดับ Walk+, Turn Left, Turn Right, Turn Around (จั่วจากบนกองตามลำดับ) / กองจั่ว 2 ใบ · กองทิ้ง 1 ใบ",
    ],
  },
  {
    id: "card-reshuffle",
    title: "3. กองจั่วหมด สับกองทิ้ง",
    summary:
      "กองจั่วเหลือ 2 ใบ ตอนเติมมือต้องสับกองทิ้งเป็นกองจั่วใหม่ (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [],
    cards: {
      hands: [["walk"], ["walk", "walk", "walk", "walk"]],
      drawPile: ["turn-left", "turn-right"],
      discardPile: [
        "walk",
        "walk",
        "walk-plus",
        "walk-plus",
        "turn-around",
        "walk-plus-plus",
      ],
    },
    steps: [
      "กด เปิด Hand แล้วกดเล่นการ์ด Walk (ใบเดียวในมือ) ดูบรรทัดสถานะ",
      "กด จบตา แล้วกด เริ่มตา ของ Player 2 ดูบรรทัดสถานะ",
      "กด จบตา ของ Player 2 แล้วกด เริ่มตา ของ Player 1 และกด เปิด Hand",
    ],
    expect: [
      "ข้อ 1: บรรทัดสถานะเป็น กองจั่ว 2 ใบ · กองทิ้ง 7 ใบ (กองทิ้งเดิม 6 ใบ + Walk ที่เพิ่งเล่น)",
      "ข้อ 2: บรรทัดสถานะเป็น กองจั่ว 5 ใบ · กองทิ้ง 0 ใบ · ล่าสุด: Player 1 มือหมด เติมมือ 4 ใบ (สับกองทิ้งเป็นกองจั่วใหม่)",
      "ข้อ 3: Hand ของ Player 1 มี 4 ใบ สองใบแรกคือ Turn Left กับ Turn Right (จากกองจั่วเดิม) อีกสองใบมาจากกองทิ้งที่สับใหม่ (ลำดับสุ่ม) / กองจั่ว 5 ใบ · กองทิ้ง 0 ใบ",
    ],
  },
  {
    id: "card-hole",
    title: "4. เล่นการ์ดแล้วเข้า Hole (เลือกปลายทาง)",
    summary:
      "ตรวจกล่องเลือกปลายทาง The Hole ที่ย้ายมาอยู่ในแผงตา ทำงานร่วมกับการเล่นการ์ด (ใช้ผู้เล่น 2 คนแรก)",
    playerCount: 2,
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [
      { typeId: "hole", row: 4, col: 6 },
      { typeId: "hole", row: 1, col: 1 },
      { typeId: "hole", row: 7, col: 7 },
    ],
    cards: {
      hands: [
        ["walk-plus", "walk", "turn-around", "turn-left"],
        ["walk", "walk", "walk", "walk"],
      ],
      drawPile: ["walk", "walk", "walk", "walk"],
      discardPile: [],
    },
    steps: [
      "กด เปิด Hand แล้วกดการ์ด Walk+",
      "ลองกดจบตา และกดการ์ดใบอื่นดู (ต้องกดไม่ได้) แล้วเลือกปลายทางจากปุ่มที่ขึ้นมา (อยากลองอีกปลายทาง ให้กดปุ่ม 'เริ่มสถานการณ์นี้ใหม่')",
    ],
    expect: [
      "ข้อ 1: Robo หยุดบน Hole ที่ แถว 5 · คอลัมน์ 7 มีปุ่มให้เลือก 2 ปุ่ม (แถว 2 · คอลัมน์ 2 และ แถว 8 · คอลัมน์ 8) และช่องปลายทางถูกไฮไลต์บนกระดาน / กองทิ้ง 1 ใบ",
      "ข้อ 2: ปุ่มจบตาถูกล็อก (ขึ้นว่าให้เลือกปลายทาง Hole ก่อนจบตา) และการ์ดทุกใบกดไม่ได้ / เมื่อเลือกแล้ว Robo วาร์ปไปปลายทางที่เลือก หันไปทางขวา Hole ที่เลือกชำรุด อีกใบไม่ชำรุด ปุ่มจบตากลับมากดได้",
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

// สร้างสถานะการ์ด { drawPile, discardPile, hands } ตามที่สถานการณ์กำหนด (ไม่สับ — เรียงตามที่เขียนไว้)
// การ์ดแต่ละใบมี uid ไม่ซ้ำ เช่น "dev-card-play-0"
export function buildScenarioCardState(scenario, playerCount) {
  let counter = 0;
  const make = (typeId) => {
    const card = { uid: `dev-${scenario.id}-card-${counter}`, typeId };
    counter += 1;
    return card;
  };
  const cards = scenario.cards;

  return {
    drawPile: cards.drawPile.map(make),
    discardPile: cards.discardPile.map(make),
    hands: Array.from({ length: playerCount }, (_, playerIndex) =>
      (cards.hands[playerIndex] ?? ["walk", "walk", "walk", "walk"]).map(make),
    ),
  };
}
