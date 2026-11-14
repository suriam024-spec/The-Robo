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
    steps: [
      "กด Walk+",
      "เลือกปลายทางจากปุ่มที่ขึ้นมา (อยากลองอีกปลายทาง ให้กดปุ่ม 'เริ่มสถานการณ์นี้ใหม่')",
    ],
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
    steps: ["กด Walk++", "จบตาให้ครบทุกคน 1 รอบ", "กด Turn Around แล้วกด Walk"],
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
    steps: ["กด Walk+", "จบตาให้ครบทุกคน 1 รอบ", "กด Turn Around แล้วกด Walk"],
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
    steps: ["กด Walk+", "จบตาให้ครบทุกคน 1 รอบ", "กด Turn Around แล้วกด Walk"],
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
  {
    id: "spring",
    title: "12. The Spring ถอย 2 ช่อง",
    summary: "ลงพอดีบน Spring แล้วถอยตรงข้าม Spring ชำรุดทันที",
    boardSize: 9,
    robo: { row: 8, col: 4, facing: "UP" },
    obstacles: [{ typeId: "spring", row: 6, col: 4 }],
    steps: ["กด Walk+", "กด Walk+ (ครั้งที่สอง)"],
    expect: [
      "ข้อ 1: Robo เดิน 2 ก้าวไปลงพอดีบน Spring (แถว 7 · คอลัมน์ 5) แล้วถูกถอยกลับ 2 ช่อง Robo จึงกลับมาอยู่ที่ แถว 9 · คอลัมน์ 5 ยังหันขึ้น ข้อความบอกว่า Spring ถอย/ดีด Robo รวม 2 ช่อง และ Spring แสดงสถานะชำรุด Crash เป็น 0 / 3",
      "ข้อ 2: Spring ชำรุดไม่ทำงาน Robo เดินไปหยุดบนช่อง Spring ที่ แถว 7 · คอลัมน์ 5 ได้ตามปกติ ไม่ถอย",
    ],
  },
  {
    id: "spring-chain",
    title: "13. The Spring 2 อัน ห่างกัน 1 ช่อง",
    summary: "อันแรกถอย 2 ไปลงบนอันที่สอง ดีดกลับ 1 ช่อง",
    boardSize: 9,
    robo: { row: 8, col: 7, facing: "UP" },
    obstacles: [
      { typeId: "spring", row: 5, col: 7 },
      { typeId: "spring", row: 7, col: 7 },
    ],
    steps: ["กด Walk++"],
    expect: [
      "Robo เดินผ่าน Spring อันล่าง (แถว 8 · คอลัมน์ 8) ไปลงพอดีบน Spring อันบน (แถว 6 · คอลัมน์ 8) เดินได้ 3 ช่อง (เดินผ่านไม่ทำงาน)",
      "Spring อันบนถอย Robo ลง 2 ช่องไปลงพอดีบน Spring อันล่าง ซึ่งดีด Robo ขึ้น 1 ช่อง Robo จึงจบที่ แถว 7 · คอลัมน์ 8 ยังหันขึ้น",
      "ข้อความบอกว่า Spring ทำงาน 2 อัน ถอย/ดีด Robo รวม 3 ช่อง และ Spring ทั้งสองอันแสดงสถานะชำรุด Crash เป็น 0 / 3",
    ],
  },
  {
    id: "spring-fall",
    title: "14. The Spring ถอยจนตกแมพ",
    summary: "ถอยเลยขอบกระดาน = ตกแมพ Crash +1",
    boardSize: 9,
    robo: { row: 0, col: 4, facing: "DOWN" },
    obstacles: [{ typeId: "spring", row: 1, col: 4 }],
    steps: ["กด Walk"],
    expect: [
      "Robo ลงพอดีบน Spring (แถว 2 · คอลัมน์ 5) แล้วถูกถอยขึ้น แต่เลยขอบกระดานจึงตกแมพ",
      "Robo กลับ Starting Point (แถว 5 · คอลัมน์ 5) ยังหันลง Crash เป็น 1 / 3 และ Spring แสดงสถานะชำรุด",
    ],
  },
  {
    id: "magnet-pull",
    title: "15. The Magnet ดึง Robo",
    summary: "จบในระยะ Magnet ถูกดึงไปลงบน Magnet ชำรุด แล้วลองกลับมาเมื่อครบรอบ",
    boardSize: 9,
    robo: { row: 8, col: 6, facing: "UP" },
    obstacles: [{ typeId: "magnet", row: 5, col: 7 }],
    steps: [
      "กด Walk+",
      "กด Walk",
      "จบตาให้ครบทุกคน 1 รอบ แล้วกด Turn Left (แค่หัน ไม่เดิน)",
    ],
    expect: [
      "ข้อ 1: Robo เดิน 2 ช่องไปจบที่ แถว 7 · คอลัมน์ 7 ซึ่งอยู่ในระยะ Magnet (แถว 6 · คอลัมน์ 8 อยู่แนวทแยง) จึงถูกดึงไปลงบนช่อง Magnet ที่ แถว 6 · คอลัมน์ 8 ยังหันขึ้น ข้อความบอกว่า Magnet ดึง Robo และ Magnet ชำรุด 1 อัน Crash เป็น 0 / 3",
      "ข้อ 2: Robo เดินขึ้นไปที่ แถว 5 · คอลัมน์ 8 ซึ่งยังติดกับ Magnet แต่ Magnet ชำรุดอยู่จึงไม่ดึง Robo อยู่ที่ แถว 5 · คอลัมน์ 8",
      "ข้อ 3: เมื่อครบรอบ Magnet กลับมาใช้งานได้ พอกด Turn Left (หันอย่างเดียว) Robo ถูกดึงกลับไปลงบนช่อง Magnet ที่ แถว 6 · คอลัมน์ 8 โดยหันไปทางซ้าย",
    ],
  },
  {
    id: "magnet-tie",
    title: "16. The Magnet 2 อัน ดึงเท่ากัน",
    summary: "อยู่ในระยะ Magnet 2 อัน Robo อยู่กับที่ ชำรุดทั้งคู่",
    boardSize: 9,
    robo: { row: 8, col: 6, facing: "UP" },
    obstacles: [
      { typeId: "magnet", row: 5, col: 7 },
      { typeId: "magnet", row: 6, col: 5 },
    ],
    steps: ["กด Walk+"],
    expect: [
      "Robo เดิน 2 ช่องไปจบที่ แถว 7 · คอลัมน์ 7 ซึ่งอยู่ในระยะ Magnet ทั้งสองอัน (แถว 6 · คอลัมน์ 8 และ แถว 7 · คอลัมน์ 6) ดึงเท่ากัน Robo จึงอยู่กับที่",
      "ข้อความบอกว่า Robo อยู่ในระยะ Magnet 2 อันพร้อมกัน จึงอยู่กับที่ และ Magnet ชำรุด 2 อัน (ทั้งสองอันแสดงสถานะชำรุด) Crash เป็น 0 / 3",
    ],
  },
  {
    id: "magnet-chain",
    title: "17. The Magnet ดึงต่อเป็นทอด",
    summary: "ดึงไปลงบน Magnet อันแรก แล้วอยู่ในระยะอันที่สอง ดึงต่อ",
    boardSize: 9,
    robo: { row: 8, col: 6, facing: "UP" },
    obstacles: [
      { typeId: "magnet", row: 6, col: 7 },
      { typeId: "magnet", row: 5, col: 8 },
    ],
    steps: ["กด Walk"],
    expect: [
      "Robo เดิน 1 ช่องไปจบที่ แถว 8 · คอลัมน์ 7 อยู่ในระยะ Magnet อันแรก (แถว 7 · คอลัมน์ 8) เท่านั้น จึงถูกดึงไปลงบนช่องนั้น",
      "จากช่องนั้นอยู่ในระยะ Magnet อันที่สอง (แถว 6 · คอลัมน์ 9) จึงถูกดึงต่อไปลงที่ แถว 6 · คอลัมน์ 9 ยังหันขึ้น",
      "ข้อความบอกว่า Magnet ดึง Robo 2 ครั้ง และ Magnet ชำรุด 2 อัน (ทั้งสองอันแสดงสถานะชำรุด) Crash เป็น 0 / 3",
    ],
  },
  {
    id: "magnet-hole-choose",
    title: "18. The Magnet หลังเลือกปลายทาง Hole",
    summary: "Hole 3 ใบ เลือกปลายทางที่อยู่ติด Magnet แล้วถูกดึงต่อ",
    boardSize: 9,
    robo: { row: 8, col: 2, facing: "UP" },
    obstacles: [
      { typeId: "hole", row: 6, col: 2 },
      { typeId: "hole", row: 6, col: 7 },
      { typeId: "hole", row: 1, col: 1 },
      { typeId: "magnet", row: 6, col: 1 },
      { typeId: "magnet", row: 7, col: 8 },
    ],
    steps: [
      "กด Walk+",
      "เลือกปลายทาง แถว 7 · คอลัมน์ 8 (อยากลองอีกปลายทาง ให้กดปุ่ม 'เริ่มสถานการณ์นี้ใหม่')",
    ],
    expect: [
      "ข้อ 1: Robo หยุดบน Hole ที่ แถว 7 · คอลัมน์ 3 มีปุ่มให้เลือก 2 ปุ่ม Magnet ที่ติด Hole นี้ (แถว 7 · คอลัมน์ 2) ยังไม่ดึง Robo เพราะยังไม่ได้เลือกปลายทาง และไม่ชำรุด",
      "ข้อ 2: Robo วาร์ปไป แถว 7 · คอลัมน์ 8 ซึ่งอยู่ในระยะ Magnet (แถว 8 · คอลัมน์ 9) จึงถูกดึงไปลงที่ แถว 8 · คอลัมน์ 9 หันขึ้น Hole ที่เลือกชำรุด Magnet ที่ แถว 8 · คอลัมน์ 9 ชำรุด ส่วน Magnet ที่ แถว 7 · คอลัมน์ 2 ไม่ชำรุด",
      "ถ้าเลือกปลายทางอีกใบ (แถว 2 · คอลัมน์ 2) Robo ไม่อยู่ในระยะ Magnet ใด จึงไม่ถูกดึง",
    ],
  },
  {
    id: "magnet-on-cell",
    title: "19. Robo จบบนช่อง Magnet",
    summary: "จบการเดินบนช่อง Magnet: Magnet ทำงานแต่ไม่ดึง ชำรุด",
    boardSize: 9,
    robo: { row: 8, col: 6, facing: "UP" },
    obstacles: [{ typeId: "magnet", row: 6, col: 6 }],
    steps: ["กด Walk+"],
    expect: [
      "Robo เดิน 2 ช่องไปลงพอดีบนช่อง Magnet ที่ แถว 7 · คอลัมน์ 7 ไม่ถูกดึงไปไหน ยังอยู่ที่เดิม",
      "ข้อความบอกว่า Robo อยู่บนช่อง Magnet Magnet ทำงานแต่ไม่ดึง และ Magnet ชำรุด 1 อัน Crash เป็น 0 / 3",
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