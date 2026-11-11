// เครื่องมือทดสอบ (ชั่วคราว): สถานการณ์สำเร็จรูปสำหรับทดสอบ Obstacle บนหน้าจอ
// ใช้ได้เฉพาะตอนรัน npm run dev (App.jsx ตรวจ import.meta.env.DEV) ไม่ติดไปกับ build จริง
// ไม่เปลี่ยนกติกาเกม: แค่จัด State เริ่มต้น (ตำแหน่ง Robo + Obstacle บนกระดาน) ไว้ให้
// หลังทำเสร็จทุกชนิดแล้ว ไฟล์นี้และโฟลเดอร์ components/Dev ลบได้
//
// พิกัดที่เขียนในข้อความนับจาก 1 (แถว 1 = บนสุด) ตรงกับที่แสดงบนหน้าจอ
// พิกัดในข้อมูล (row, col) นับจาก 0 เหมือนในโค้ดเกม ทั้งหมดอยู่บนกระดาน 9x9 (Starting Point = แถว 5 · คอลัมน์ 5)

export const DEV_SCENARIOS = [
  {
    id: "wall",
    title: "1. The Wall ขวางหน้า",
    summary: "Wall อยู่ข้างหน้า 2 ช่อง ทดสอบการหยุดก่อนถึง Wall",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [{ typeId: "wall", row: 2, col: 4 }],
    steps: ["กด Walk++", "กด Walk (ครั้งที่สอง)"],
    expect: [
      "ข้อ 1: Robo หยุดที่ แถว 4 · คอลัมน์ 5 (ก่อนถึง Wall) เดินได้ 1 ช่อง ข้อความบอกว่าชน Wall",
      "ข้อ 2: Robo ไม่ขยับ (เดินได้ 0 ช่อง) ข้อความยังบอกว่าชน Wall",
      "ทั้งสองข้อ: Crash ต้องเป็น 0 / 3",
    ],
  },
  {
    id: "hole-0",
    title: "2. The Hole ไม่มีปลายทาง",
    summary: "มี Hole ใบเดียว กลับ Starting Point และ Hole ชำรุด",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [{ typeId: "hole", row: 4, col: 6 }],
    steps: [
      "กด Walk+",
      "กด Walk++",
      "จบตาให้ครบทุกคน 1 รอบ",
      "กด Turn Around แล้วกด Walk",
    ],
    expect: [
      "ข้อ 1: Robo กลับ Starting Point (แถว 5 · คอลัมน์ 5) ยังหันไปทางขวา Crash เป็น 0 / 3 (ไม่นับ Crash)",
      "ข้อ 1: ข้อความบอกว่าไม่มีปลายทางที่ใช้ได้ และ Hole ที่ แถว 5 · คอลัมน์ 7 ชำรุด",
      "ข้อ 2: Robo เดินผ่าน Hole ที่ชำรุดไปถึง แถว 5 · คอลัมน์ 8 เดินได้ 3 ช่อง ไม่กลับ Starting Point",
      "ข้อ 3: เมื่อครบรอบ Hole กลับมาใช้งานได้",
      "ข้อ 4: Robo ก้าวเข้า Hole ที่ใช้งานได้ กลับ Starting Point (แถว 5 · คอลัมน์ 5) หันไปทางซ้าย และ Hole ชำรุดอีกครั้ง",
    ],
  },
  {
    id: "hole-1",
    title: "3. The Hole วาร์ปอัตโนมัติ",
    summary: "มี Hole 2 ใบ วาร์ปเอง และ Hole ปลายทางชำรุด 1 Turn",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [
      { typeId: "hole", row: 4, col: 6 },
      { typeId: "hole", row: 1, col: 1 },
    ],
    steps: [
      "กด Walk+",
      "จบตาให้ครบทุกคน 1 รอบ (กดจบตา แล้วกดเริ่มตาของคนถัดไปในหน้าส่งต่อ จนกลับมาถึง Player 1)",
    ],
    expect: [
      "ข้อ 1: Robo ไปอยู่ที่ แถว 2 · คอลัมน์ 2 หันไปทางขวา และหยุดเดิน (ไม่เดินต่อ)",
      "ข้อ 1: Hole ที่ แถว 2 · คอลัมน์ 2 แสดงสถานะชำรุด ส่วน Hole ที่ แถว 5 · คอลัมน์ 7 ไม่ชำรุด Crash ยังเป็น 0",
      "ข้อ 2: เมื่อครบรอบ Hole ที่ แถว 2 · คอลัมน์ 2 กลับมาใช้งานได้ (ไม่ชำรุดแล้ว)",
    ],
  },
  {
    id: "hole-2",
    title: "4. The Hole เลือกปลายทางเอง",
    summary: "มี Hole 3 ใบ ผู้เล่นเลือกปลายทาง",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [
      { typeId: "hole", row: 4, col: 6 },
      { typeId: "hole", row: 1, col: 1 },
      { typeId: "hole", row: 7, col: 7 },
    ],
    steps: ["กด Walk+", "เลือกปลายทางจากปุ่มที่ขึ้นมา (อยากลองอีกปลายทาง ให้กดปุ่ม 'เริ่มสถานการณ์นี้ใหม่')"],
    expect: [
      "ข้อ 1: Robo หยุดบน Hole ที่ แถว 5 · คอลัมน์ 7 มีปุ่มให้เลือก 2 ปุ่ม (แถว 2 · คอลัมน์ 2 และ แถว 8 · คอลัมน์ 8) และช่องปลายทางถูกไฮไลต์บนกระดาน",
      "ข้อ 1: ปุ่มคำสั่งเดินและปุ่มจบตาถูกล็อกจนกว่าจะเลือก",
      "ข้อ 2: Robo วาร์ปไปปลายทางที่เลือก หันไปทางขวา Hole ที่เลือกชำรุด อีกใบไม่ชำรุด",
    ],
  },
  {
    id: "hole-damaged",
    title: "5. The Hole ที่ชำรุดไม่ทำงาน",
    summary: "Hole ชำรุดเดินผ่านได้ แล้วกลับมาใช้งานหลังครบรอบ",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [
      { typeId: "hole", row: 4, col: 6, damagedTurns: 1 },
      { typeId: "hole", row: 1, col: 1 },
    ],
    steps: [
      "กด Walk++",
      "จบตาให้ครบทุกคน 1 รอบ",
      "กด Turn Around แล้วกด Walk",
    ],
    expect: [
      "ข้อ 1: Robo เดินผ่าน Hole ที่ชำรุดไปถึง แถว 5 · คอลัมน์ 8 เดินได้ 3 ช่อง ไม่วาร์ป",
      "ข้อ 2: เมื่อครบรอบ Hole ที่ แถว 5 · คอลัมน์ 7 กลับมาใช้งานได้",
      "ข้อ 3: Robo ก้าวเข้า Hole ที่ใช้งานได้แล้ววาร์ปไปที่ แถว 2 · คอลัมน์ 2 หันไปทางซ้าย",
    ],
  },
  {
    id: "fall",
    title: "6. ตกแมพ (ไม่มี Obstacle)",
    summary: "ตรวจการนับ Crash เหมือนเดิม",
    boardSize: 9,
    robo: { row: 1, col: 4, facing: "UP" },
    obstacles: [],
    steps: ["กด Walk++"],
    expect: [
      "Robo เดินได้ 1 ช่องแล้วตกแมพ กลับ Starting Point (แถว 5 · คอลัมน์ 5) ยังหันขึ้นบน",
      "Crash เป็น 1 / 3",
    ],
  },
  {
    id: "scrap",
    title: "7. The Scrap หยุดบนช่อง",
    summary: "Scrap หยุด Robo บนช่อง ชำรุดทันที แล้วกลับมาใช้ได้หลังครบรอบ",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [{ typeId: "scrap", row: 2, col: 4 }],
    steps: [
      "กด Walk++",
      "กด Walk",
      "จบตาให้ครบทุกคน 1 รอบ",
      "กด Turn Around แล้วกด Walk",
    ],
    expect: [
      "ข้อ 1: Robo หยุดบนช่อง Scrap ที่ แถว 3 · คอลัมน์ 5 เดินได้ 2 ช่อง (ก้าวที่ 3 ถูกยกเลิก) Crash เป็น 0 / 3 ข้อความบอกว่า Scrap ชำรุด และ Scrap แสดงสถานะชำรุด",
      "ข้อ 2: Robo เดินออกจาก Scrap ไปที่ แถว 2 · คอลัมน์ 5 ได้ปกติ (ยืนบน Scrap แล้วเดินออก ไม่ทำงานซ้ำ)",
      "ข้อ 3: เมื่อครบรอบ Scrap กลับมาใช้งานได้ (ไม่ชำรุดแล้ว)",
      "ข้อ 4: Robo ก้าวเข้าช่อง Scrap เป็นก้าวสุดท้ายพอดี หยุดบน แถว 3 · คอลัมน์ 5 หันลง และ Scrap ชำรุดอีกครั้ง",
    ],
  },
  {
    id: "oil",
    title: "8. The Oil เดินเพิ่ม 1 ก้าว",
    summary: "Oil เพิ่มก้าวแล้วชำรุดทันที แล้วกลับมาใช้ได้หลังครบรอบ",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "UP" },
    obstacles: [{ typeId: "oil", row: 2, col: 4 }],
    steps: [
      "กด Walk+",
      "จบตาให้ครบทุกคน 1 รอบ",
      "กด Turn Around แล้วกด Walk",
    ],
    expect: [
      "ข้อ 1: Walk+ เดิน 2 ก้าว ก้าวที่ 2 ลงบน Oil พอดี จึงเดินเพิ่มอีก 1 ก้าว Robo อยู่ที่ แถว 2 · คอลัมน์ 5 เดินได้ 3 ช่อง ข้อความบอกว่า Oil ทำให้เดินเพิ่ม 1 ช่อง และ Oil ชำรุด Crash เป็น 0 / 3",
      "ข้อ 2: เมื่อครบรอบ Oil กลับมาใช้งานได้ (ไม่ชำรุดแล้ว)",
      "ข้อ 3: Robo หันลงแล้วเดิน 1 ก้าวเข้า Oil เป็นก้าวสุดท้ายพอดี จึงเดินเพิ่มอีก 1 ก้าว Robo อยู่ที่ แถว 4 · คอลัมน์ 5 เดินได้ 2 ช่อง และ Oil ชำรุดอีกครั้ง",
    ],
  },
  {
    id: "oil-chain",
    title: "9. The Oil ติดกัน",
    summary: "Oil 2 อันติดกัน เดินเพิ่มทีละอัน ชำรุดทั้งคู่",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [
      { typeId: "oil", row: 4, col: 6 },
      { typeId: "oil", row: 4, col: 7 },
    ],
    steps: [
      "กด Walk+",
      "จบตาให้ครบทุกคน 1 รอบ",
      "กด Turn Around แล้วกด Walk",
    ],
    expect: [
      "ข้อ 1: Robo เดินผ่าน Oil อันแรกแล้วเดินเพิ่ม เจอ Oil อันที่สองแล้วเดินเพิ่มอีก Robo อยู่ที่ แถว 5 · คอลัมน์ 9 เดินได้ 4 ช่อง ข้อความบอกว่า Oil ทำให้เดินเพิ่ม 2 ช่อง และ Oil ชำรุด 2 อัน (ทั้งสองอันแสดงสถานะชำรุด)",
      "ข้อ 2: เมื่อครบรอบ Oil ทั้งสองอันกลับมาใช้งานได้",
      "ข้อ 3: Robo หันซ้ายแล้วเดิน 1 ก้าว เจอ Oil ทั้งสองอันต่อกัน เดินเพิ่มรวม 2 ก้าว Robo อยู่ที่ แถว 5 · คอลัมน์ 6 หันซ้าย เดินได้ 3 ช่อง และ Oil ชำรุดทั้งคู่อีกครั้ง",
    ],
  },
  {
    id: "oil-wall",
    title: "10. The Oil แล้วก้าวเพิ่มชน Wall",
    summary: "ก้าวที่เพิ่มมาเป็นก้าวปกติ จึงชน Wall ได้",
    boardSize: 9,
    robo: { row: 4, col: 4, facing: "RIGHT" },
    obstacles: [
      { typeId: "oil", row: 4, col: 6 },
      { typeId: "wall", row: 4, col: 7 },
    ],
    steps: ["กด Walk+"],
    expect: [
      "Robo เดินถึง Oil ที่ แถว 5 · คอลัมน์ 7 (ได้ก้าวเพิ่ม 1) แต่ก้าวที่เพิ่มถูก Wall ขวาง Robo จึงหยุดอยู่บน Oil เดินได้ 2 ช่อง",
      "ข้อความบอกว่าชน Wall และต่อท้ายว่า Oil ทำให้เดินเพิ่ม 1 ช่อง (Oil ชำรุด 1 อัน) Oil แสดงสถานะชำรุด Crash เป็น 0 / 3",
    ],
  },
  {
    id: "destroyer",
    title: "11. The Destroyer ทำให้ Robo พัง",
    summary: "พังแล้ว Crash +1 กลับ Starting Point และ Destroyer ชำรุด",
    boardSize: 9,
    robo: { row: 4, col: 8, facing: "LEFT" },
    obstacles: [
      { typeId: "destroyer", row: 4, col: 6 },
      { typeId: "destroyer", row: 4, col: 2 },
    ],
    steps: [
      "กด Walk++",
      "กด Walk++ (ครั้งที่สอง)",
      "กด Turn Around แล้วกด Walk++",
    ],
    expect: [
      "ข้อ 1: Robo เดินได้ 2 ช่องแล้วชน Destroyer ที่ แถว 5 · คอลัมน์ 7 พังทันที (ก้าวที่ 3 ถูกยกเลิก) กลับ Starting Point (แถว 5 · คอลัมน์ 5) ยังหันซ้าย Crash เป็น 1 / 3 ข้อความบอกว่า Robo พัง และ Destroyer ที่ แถว 5 · คอลัมน์ 7 แสดงสถานะชำรุด",
      "ข้อ 2: Robo เดินได้ 2 ช่องแล้วชน Destroyer อีกอันที่ แถว 5 · คอลัมน์ 3 พังอีกครั้ง กลับ Starting Point Crash เป็น 2 / 3 (นับต่อเนื่อง) และอันนี้ชำรุดด้วย",
      "ข้อ 3: Robo หันขวาแล้วเดินผ่าน Destroyer ที่ชำรุด (แถว 5 · คอลัมน์ 7) ไปถึง แถว 5 · คอลัมน์ 8 เดินได้ 3 ช่อง ไม่พัง Crash ยังเป็น 2 / 3",
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