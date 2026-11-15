// M4.2 — ข้อมูลและกติกาของ Virus Cards (ฟังก์ชันล้วน ไม่ผูกกับหน้าจอ)
//
// การ์ด Virus 21 ชนิดตาม GDD v0.2 หัวข้อ 20-22 แบ่งเป็น
//   WITH 15 ชนิด (หัวข้อ 21) ใช้ร่วมกับ Movement Card
//   HACK  6 ชนิด (หัวข้อ 22) ใช้หลังขั้นแลก Movement ครั้งละ 1 Hack
// M4.2 ทำแค่ "ตัวการ์ด": กอง / มือ 2 ใบ / จั่ว / ใต้กอง ยังไม่มีผลของการ์ด (ผลของการ์ดทำใน M4.3 และ M5)
// ช่อง summary เป็นข้อความย่อตาม GDD ไว้แสดงบนการ์ดในมือ
//
// จำนวนการ์ดต่อชนิด: GDD ไม่ได้กำหนด ค่าเริ่มต้นเป็นค่าชั่วคราวตามความแรง (OWNER อนุมัติ V1 และให้ DEV กำหนด)
//   แรงมาก = 1 ใบ / ปานกลางหรือขึ้นกับสถานการณ์ = 2 ใบ / เบาหรือใช้ง่าย = 3 ใบ
//   ปรับได้ในหน้า Setup และรอตัดสินจริงตอน Playtest M7
// ทุกฟังก์ชันรับจำนวนต่อชนิดเป็นพารามิเตอร์ ไม่อ่านจากค่าคงที่ตรง ๆ (ทำเหมือน movementCards.js)
//
// id ของการ์ด (ภาษาอังกฤษแบบ kebab-case) ต้องคงที่ตลอดโปรเจกต์ ใช้ในการเก็บค่าใน localStorage และในข้อมูลสถานการณ์ทดสอบ
//   WITH: ขาหัก = broken-leg / ขาหัก+ = broken-leg-plus / ย้อนรอย = backtrack / กระโดด = jump
//         โคตรไวรัส = mega-virus / โคตรไวรัส+ = mega-virus-plus / น็อตหลุด = loose-bolt
//         ซ่อมได้ใช่ไหม? = repair-yes / ซ่อมได้แน่นอน! = repair-sure / ซ่อมทำไมเนี่ย!! = repair-why / อัจฉริยะ! = genius
//         ตัวกระจายไวรัส! = virus-spreader / ตัวการแจกไวรัส! = virus-dealer
//         แอนตี้ไวรัส = anti-virus / แอนตี้ไวรัส+ = anti-virus-plus
//   HACK: ฉันขอละนะ = i-take / เปลี่ยนกับฉัน = swap-with-me / เปลี่ยนกับฉันซะ = swap-with-me-now
//         ส่งไวรัสมา = send-virus / ยอดสายลับ = super-spy / ม้าโทรจัน = trojan-horse

// ผู้เล่นแต่ละคนถือ Virus ให้ครบ 2 ใบ (GDD หัวข้อ 3 และ 25)
export const VIRUS_HAND_SIZE = 2;

// เพดานจำนวนต่อชนิดในหน้าตั้งค่า (กันพิมพ์ผิดเป็นเลขใหญ่เกินไป)
export const MAX_VIRUS_PER_TYPE = 99;

// ชนิดการ์ดทั้งหมด เรียงตามลำดับใน GDD (WITH ก่อน HACK)
export const VIRUS_CARD_TYPES = [
  // ---------- WITH (15) ----------
  {
    id: "broken-leg",
    label: "ขาหัก",
    kind: "WITH",
    summary: "Movement ครั้งถัดไป: ลดระยะเดิน 1 ช่อง",
  },
  {
    id: "broken-leg-plus",
    label: "ขาหัก+",
    kind: "WITH",
    summary: "Movement ครั้งถัดไป: ลดระยะเดิน 2 ช่อง",
  },
  {
    id: "backtrack",
    label: "ย้อนรอย",
    kind: "WITH",
    summary: "Movement ครั้งถัดไป: เปลี่ยนเป็นผลตรงข้าม",
  },
  {
    id: "jump",
    label: "กระโดด",
    kind: "WITH",
    summary: "Movement ครั้งถัดไป: เดินแบบเว้นช่อง",
  },
  {
    id: "mega-virus",
    label: "โคตรไวรัส",
    kind: "WITH",
    summary: "Movement ครั้งถัดไป: ไม่สามารถใช้งานได้",
  },
  {
    id: "mega-virus-plus",
    label: "โคตรไวรัส+",
    kind: "WITH",
    summary: "Movement + Virus ครั้งถัดไป: ไม่สามารถใช้งานได้",
  },
  {
    id: "loose-bolt",
    label: "น็อตหลุด",
    kind: "WITH",
    summary: "เปลี่ยนลำดับจาก Movement → Virus เป็น Virus → Movement",
  },
  {
    id: "repair-yes",
    label: "ซ่อมได้ใช่ไหม?",
    kind: "WITH",
    summary:
      "เมื่อ Robo ลงบน Obstacle ที่ชำรุด: คืนสภาพและทำงานทันที หากเข้าเงื่อนไข",
  },
  {
    id: "repair-sure",
    label: "ซ่อมได้แน่นอน!",
    kind: "WITH",
    summary:
      "เมื่อ Robo ลงบน Obstacle ที่ชำรุด: คืนสภาพ แต่ไม่ทำงานใน Turn นี้",
  },
  {
    id: "repair-why",
    label: "ซ่อมทำไมเนี่ย!!",
    kind: "WITH",
    summary: "Obstacle รอบ Robo: คืนสภาพและทำงานทันที หากเข้าเงื่อนไข",
  },
  {
    id: "genius",
    label: "อัจฉริยะ!",
    kind: "WITH",
    summary: "Obstacle รอบ Robo: คืนสภาพ แต่ไม่ทำงานใน Turn นี้",
  },
  {
    id: "virus-spreader",
    label: "ตัวกระจายไวรัส!",
    kind: "WITH",
    summary: "Obstacle ที่ Robo ลง: ชำรุด 1 Turn",
  },
  {
    id: "virus-dealer",
    label: "ตัวการแจกไวรัส!",
    kind: "WITH",
    summary: "Obstacle รอบ Robo: ชำรุด 1 Turn",
  },
  {
    id: "anti-virus",
    label: "แอนตี้ไวรัส",
    kind: "WITH",
    summary: "Virus ครั้งถัดไป: ไม่ทำงาน",
  },
  {
    id: "anti-virus-plus",
    label: "แอนตี้ไวรัส+",
    kind: "WITH",
    summary: "Virus: ไม่ทำงานอีกตลอด Turn นี้",
  },
  // ---------- HACK (6) ----------
  {
    id: "i-take",
    label: "ฉันขอละนะ",
    kind: "HACK",
    summary: "เลือกผู้เล่น 1 คน: แลก Movement Card 1 ใบ (หลังการแลก)",
  },
  {
    id: "swap-with-me",
    label: "เปลี่ยนกับฉัน",
    kind: "HACK",
    summary: "เลือกผู้เล่น 1 คน: บังคับแลก Movement Card",
  },
  {
    id: "swap-with-me-now",
    label: "เปลี่ยนกับฉันซะ",
    kind: "HACK",
    summary: "เลือกผู้เล่น 1 คน: บังคับแลก Movement Card + Virus Card",
  },
  {
    id: "send-virus",
    label: "ส่งไวรัสมา",
    kind: "HACK",
    summary: "เลือกผู้เล่น 1 คน: ให้ส่ง Virus 1 ใบมา",
  },
  {
    id: "super-spy",
    label: "ยอดสายลับ",
    kind: "HACK",
    summary: "เลือกผู้เล่น 1 คน: ดู Secret Mission ของผู้เล่นคนนั้น",
  },
  {
    id: "trojan-horse",
    label: "ม้าโทรจัน",
    kind: "HACK",
    summary:
      "ส่ง Virus 1 ใบให้ผู้เล่น 1 คน (เป้าหมายต้องมี Virus อย่างน้อย 1 ใบ / ถ้าผู้ใช้มี Virus เพียง 1 ใบ ใช้ไม่ได้)",
  },
];

// จำนวนเริ่มต้นต่อชนิด (รวม 42 ใบ: WITH 30 + HACK 12) — ค่าชั่วคราว V1
// ผู้เล่น 6 คนใช้แจก 12 ใบ จึงพอ (ถ้าตั้งจำนวนต่ำกว่านี้ ปุ่มเริ่มเกมจะกดไม่ได้)
export const DEFAULT_VIRUS_COUNTS = {
  "broken-leg": 3,
  "broken-leg-plus": 2,
  backtrack: 2,
  jump: 2,
  "mega-virus": 1,
  "mega-virus-plus": 1,
  "loose-bolt": 2,
  "repair-yes": 2,
  "repair-sure": 2,
  "repair-why": 2,
  genius: 2,
  "virus-spreader": 3,
  "virus-dealer": 2,
  "anti-virus": 3,
  "anti-virus-plus": 1,
  "i-take": 3,
  "swap-with-me": 2,
  "swap-with-me-now": 1,
  "send-virus": 2,
  "super-spy": 2,
  "trojan-horse": 2,
};

// หาชนิดการ์ดจาก id คืน null ถ้าไม่รู้จัก
export function getVirusType(typeId) {
  return VIRUS_CARD_TYPES.find((type) => type.id === typeId) ?? null;
}

// จำนวนการ์ดรวมตามตารางจำนวน (นับเฉพาะชนิดที่รู้จัก)
export function countVirusTotal(counts) {
  return VIRUS_CARD_TYPES.reduce(
    (sum, type) =>
      sum + (Number.isInteger(counts?.[type.id]) ? counts[type.id] : 0),
    0,
  );
}

// ตรวจตารางจำนวนที่ตั้งจากหน้าเว็บ
// ต้องมีครบทุกชนิด ทุกค่าเป็นจำนวนเต็ม 0 ถึง MAX_VIRUS_PER_TYPE และไม่มีชนิดแปลกปลอม และรวมอย่างน้อย 1 ใบ
// คืนค่า { ok: true, total } หรือ { ok: false, reason, message, typeId? }
export function validateVirusCounts(counts) {
  if (counts === null || typeof counts !== "object" || Array.isArray(counts)) {
    return {
      ok: false,
      reason: "NOT_OBJECT",
      message: "ตารางจำนวนการ์ดไม่ถูกต้อง",
    };
  }

  const knownIds = new Set(VIRUS_CARD_TYPES.map((type) => type.id));
  for (const key of Object.keys(counts)) {
    if (!knownIds.has(key)) {
      return {
        ok: false,
        reason: "UNKNOWN_TYPE",
        message: `ไม่รู้จักชนิดการ์ด ${key}`,
        typeId: key,
      };
    }
  }

  for (const type of VIRUS_CARD_TYPES) {
    const value = counts[type.id];
    if (!Number.isInteger(value)) {
      return {
        ok: false,
        reason: "NOT_INTEGER",
        message: `จำนวนของ ${type.label} ต้องเป็นจำนวนเต็ม`,
        typeId: type.id,
      };
    }
    if (value < 0 || value > MAX_VIRUS_PER_TYPE) {
      return {
        ok: false,
        reason: "OUT_OF_RANGE",
        message: `จำนวนของ ${type.label} ต้องอยู่ระหว่าง 0 ถึง ${MAX_VIRUS_PER_TYPE}`,
        typeId: type.id,
      };
    }
  }

  const total = countVirusTotal(counts);
  if (total < 1) {
    return { ok: false, reason: "EMPTY", message: "ต้องมีการ์ดอย่างน้อย 1 ใบ" };
  }
  return { ok: true, total };
}

// ตรวจว่าจำนวนการ์ดพอแจกมือเริ่มต้นให้ผู้เล่นทุกคนหรือไม่ (ผู้เล่น x 2 ใบ)
// คืนค่า { ok: true } หรือ { ok: false, reason: "NOT_ENOUGH_CARDS", message, needed, total }
export function canDealVirus(counts, playerCount) {
  const total = countVirusTotal(counts);
  const needed = playerCount * VIRUS_HAND_SIZE;
  if (total < needed) {
    return {
      ok: false,
      reason: "NOT_ENOUGH_CARDS",
      message: `การ์ด Virus ไม่พอแจก: ผู้เล่น ${playerCount} คนต้องใช้ ${needed} ใบ แต่ตั้งไว้ ${total} ใบ`,
      needed,
      total,
    };
  }
  return { ok: true };
}

// สร้างกอง Virus ตามจำนวนต่อชนิด (ยังไม่สับ) เรียงตามชนิดในตาราง
// การ์ดแต่ละใบ = { uid, typeId } uid ไม่ซ้ำกันในกอง เช่น "vr-broken-leg-1", "vr-broken-leg-2"
export function buildVirusDeck(counts) {
  return VIRUS_CARD_TYPES.flatMap((type) =>
    Array.from({ length: counts[type.id] ?? 0 }, (_, k) => ({
      uid: `vr-${type.id}-${k + 1}`,
      typeId: type.id,
    })),
  );
}
