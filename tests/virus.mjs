// tests/virus.mjs — ทดสอบ Virus Cards (M4.2) (รันด้วย: node tests/virus.mjs)
// กติกา (OWNER อนุมัติ M4.2 V1-V3): ดูหัวไฟล์ src/game/cards/virusCards.js และฟังก์ชัน topUpHand / swapUnderDeck ใน deck.js
//   · Virus 21 ชนิด (WITH 15 + HACK 6) ค่าเริ่มต้นรวม 42 ใบ (WITH 30 + HACK 12) / ผู้เล่นละ 2 ใบ
//   · topUpHand: เติมมือให้ครบเป้าหมาย (เท่าที่มี) กองจั่วหมดกลางทางสับกองทิ้งเป็นกองจั่วแล้วจั่วต่อ
//   · swapUnderDeck: (กองจั่วว่าง + กองทิ้งมี → สับกองทิ้งก่อน) → ใส่ใบที่เลือกใต้กอง → จั่วใบบนสุด 1 ใบ
//       กองจั่วและกองทิ้งว่างทั้งคู่ → ได้ใบเดิมกลับมา (ยอมรับ)
// ส่วนที่ 2: "ผู้ตรวจอิสระ" จำลองด้วยรายการ uid ที่เขียนแยกจากโค้ดเกม แล้วเทียบกับ fuzz เกมสุ่มหลายพันเกม
// ไฟล์นี้ไม่แตะ cards.mjs และไม่ใช้ข้อมูลจาก virusCards.js เป็น "คำตอบ" (ตาราง V1 เขียนซ้ำเองด้วยชื่อภาษาไทย)

import assert from "node:assert/strict";
import {
  DEFAULT_VIRUS_COUNTS,
  MAX_VIRUS_PER_TYPE,
  VIRUS_CARD_TYPES,
  VIRUS_HAND_SIZE,
  buildVirusDeck,
  canDealVirus,
  countVirusTotal,
  getVirusType,
  validateVirusCounts,
} from "../src/game/cards/virusCards.js";
import {
  countAllCards,
  createCardState,
  drawToHand,
  playCard,
  refillHand,
  swapUnderDeck,
  topUpHand,
} from "../src/game/cards/deck.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ผ่าน  ${name}`);
  } catch (error) {
    console.log(`  ไม่ผ่าน  ${name}`);
    console.log(error.message);
    process.exitCode = 1;
  }
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const card = (uid, typeId = "broken-leg") => ({ uid, typeId });
const uids = (cards) => cards.map((item) => item.uid);
const cloneCounts = () => ({ ...DEFAULT_VIRUS_COUNTS });
const mk = (...ids) => ids.map((u) => card(u));

// ---------------------------------------------------------------------------
// ตารางที่ผู้ตรวจเขียนซ้ำเองจาก V1 และ GDD (ใช้ชื่อภาษาไทยเป็นกุญแจ ไม่พึ่ง id ในโค้ดเกม)
// ---------------------------------------------------------------------------
const EXPECTED_WITH = [
  ["ขาหัก", 3],
  ["ขาหัก+", 2],
  ["ย้อนรอย", 2],
  ["กระโดด", 2],
  ["โคตรไวรัส", 1],
  ["โคตรไวรัส+", 1],
  ["น็อตหลุด", 2],
  ["ซ่อมได้ใช่ไหม?", 2],
  ["ซ่อมได้แน่นอน!", 2],
  ["ซ่อมทำไมเนี่ย!!", 2],
  ["อัจฉริยะ!", 2],
  ["ตัวกระจายไวรัส!", 3],
  ["ตัวการแจกไวรัส!", 2],
  ["แอนตี้ไวรัส", 3],
  ["แอนตี้ไวรัส+", 1],
];
const EXPECTED_HACK = [
  ["ฉันขอละนะ", 3],
  ["เปลี่ยนกับฉัน", 2],
  ["เปลี่ยนกับฉันซะ", 1],
  ["ส่งไวรัสมา", 2],
  ["ยอดสายลับ", 2],
  ["ม้าโทรจัน", 2],
];

// ถ้ามีสระอำที่ถูกแปลงรูปตอนคัดลอก ให้เทียบแบบ normalize (NFC) เพื่อไม่ให้ไฟล์ทดสอบพังเพราะรูปอักษร
const norm = (text) => text.normalize("NFC");

console.log("ส่วนที่ 1: ทดสอบกรณีเฉพาะ");

test("ชนิดการ์ด: 21 ชนิด (WITH 15 + HACK 6) เรียงตาม GDD / id เป็น kebab-case ไม่ซ้ำ / ชื่อไม่ซ้ำ / มีข้อความย่อ", () => {
  assert.equal(VIRUS_CARD_TYPES.length, 21);
  assert.equal(VIRUS_CARD_TYPES.filter((t) => t.kind === "WITH").length, 15);
  assert.equal(VIRUS_CARD_TYPES.filter((t) => t.kind === "HACK").length, 6);
  // WITH มาก่อน HACK เสมอ
  assert.deepEqual(
    VIRUS_CARD_TYPES.map((t) => t.kind),
    [...Array(15).fill("WITH"), ...Array(6).fill("HACK")],
  );
  // ชื่อเรียงตามลำดับ GDD
  assert.deepEqual(
    VIRUS_CARD_TYPES.map((t) => norm(t.label)),
    [...EXPECTED_WITH, ...EXPECTED_HACK].map(([label]) => norm(label)),
  );
  const ids = VIRUS_CARD_TYPES.map((t) => t.id);
  assert.equal(new Set(ids).size, 21);
  assert.equal(new Set(VIRUS_CARD_TYPES.map((t) => t.label)).size, 21);
  for (const type of VIRUS_CARD_TYPES) {
    assert.match(
      type.id,
      /^[a-z]+(-[a-z]+)*$/,
      `id ไม่ใช่ kebab-case: ${type.id}`,
    );
    assert.equal(typeof type.summary, "string");
    assert.ok(type.summary.length > 0, `${type.id} ไม่มีข้อความย่อ`);
    assert.deepEqual(Object.keys(type).sort(), [
      "id",
      "kind",
      "label",
      "summary",
    ]);
  }
});

test("id ที่ตั้งไว้ตรงกับที่ OWNER อนุมัติ (id คงที่ ห้ามเปลี่ยน)", () => {
  assert.deepEqual(
    VIRUS_CARD_TYPES.map((t) => t.id),
    [
      "broken-leg",
      "broken-leg-plus",
      "backtrack",
      "jump",
      "mega-virus",
      "mega-virus-plus",
      "loose-bolt",
      "repair-yes",
      "repair-sure",
      "repair-why",
      "genius",
      "virus-spreader",
      "virus-dealer",
      "anti-virus",
      "anti-virus-plus",
      "i-take",
      "swap-with-me",
      "swap-with-me-now",
      "send-virus",
      "super-spy",
      "trojan-horse",
    ],
  );
});

test("ค่าเริ่มต้น: ตรงตาราง V1 ทุกชนิด (เทียบด้วยชื่อไทย) รวม 42 ใบ WITH 30 / HACK 12", () => {
  const byLabel = new Map(VIRUS_CARD_TYPES.map((t) => [norm(t.label), t]));
  for (const [label, count] of EXPECTED_WITH) {
    const type = byLabel.get(norm(label));
    assert.ok(type, `ไม่พบ ${label}`);
    assert.equal(type.kind, "WITH", label);
    assert.equal(DEFAULT_VIRUS_COUNTS[type.id], count, label);
  }
  for (const [label, count] of EXPECTED_HACK) {
    const type = byLabel.get(norm(label));
    assert.ok(type, `ไม่พบ ${label}`);
    assert.equal(type.kind, "HACK", label);
    assert.equal(DEFAULT_VIRUS_COUNTS[type.id], count, label);
  }
  assert.deepEqual(
    Object.keys(DEFAULT_VIRUS_COUNTS),
    VIRUS_CARD_TYPES.map((t) => t.id),
  );
  const sum = (rows) => rows.reduce((s, [, n]) => s + n, 0);
  assert.equal(sum(EXPECTED_WITH), 30);
  assert.equal(sum(EXPECTED_HACK), 12);
  assert.equal(countVirusTotal(DEFAULT_VIRUS_COUNTS), 42);
  assert.deepEqual(validateVirusCounts(DEFAULT_VIRUS_COUNTS), {
    ok: true,
    total: 42,
  });
});

test("ค่าคงที่: มือ Virus 2 ใบ / เพดาน 99 ต่อชนิด / ผู้เล่น 6 คนแจกได้ (HACK 12 ใบ ≥ 6 x 2)", () => {
  assert.equal(VIRUS_HAND_SIZE, 2);
  assert.equal(MAX_VIRUS_PER_TYPE, 99);
  const hack = VIRUS_CARD_TYPES.filter((t) => t.kind === "HACK").reduce(
    (s, t) => s + DEFAULT_VIRUS_COUNTS[t.id],
    0,
  );
  assert.ok(hack >= 6 * 2);
});

test("getVirusType: หาชนิดจาก id / ไม่รู้จัก → null", () => {
  assert.equal(getVirusType("jump").label, "กระโดด");
  assert.equal(getVirusType("trojan-horse").kind, "HACK");
  assert.equal(getVirusType("nope"), null);
  assert.equal(getVirusType(undefined), null);
});

test("countVirusTotal: นับเฉพาะชนิดที่รู้จักและเป็นจำนวนเต็ม / ไม่มีตาราง → 0", () => {
  assert.equal(countVirusTotal({}), 0);
  assert.equal(countVirusTotal(null), 0);
  assert.equal(countVirusTotal(undefined), 0);
  assert.equal(
    countVirusTotal({
      jump: 3,
      "anti-virus": 2,
      bogus: 50,
      genius: 1.5,
      "i-take": "4",
    }),
    5,
  );
});

test("validateVirusCounts: ไม่ใช่ตาราง / ชนิดแปลกปลอม / ขาดชนิด / ไม่ใช่จำนวนเต็ม / นอกช่วง / รวมเป็น 0", () => {
  for (const bad of [null, undefined, [], "x", 5]) {
    const result = validateVirusCounts(bad);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "NOT_OBJECT");
  }
  const unknown = validateVirusCounts({ ...cloneCounts(), bogus: 1 });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, "UNKNOWN_TYPE");
  assert.equal(unknown.typeId, "bogus");

  const missing = cloneCounts();
  delete missing.jump;
  const noKey = validateVirusCounts(missing);
  assert.equal(noKey.ok, false);
  assert.equal(noKey.reason, "NOT_INTEGER");
  assert.equal(noKey.typeId, "jump");

  for (const value of [1.5, "3", NaN, Infinity, null, undefined]) {
    const result = validateVirusCounts({ ...cloneCounts(), genius: value });
    assert.equal(result.ok, false, `ค่า ${String(value)}`);
    assert.equal(result.reason, "NOT_INTEGER");
    assert.equal(result.typeId, "genius");
  }
  for (const value of [-1, 100, 1000]) {
    const result = validateVirusCounts({
      ...cloneCounts(),
      "super-spy": value,
    });
    assert.equal(result.ok, false, `ค่า ${value}`);
    assert.equal(result.reason, "OUT_OF_RANGE");
    assert.equal(result.typeId, "super-spy");
  }
  assert.equal(
    validateVirusCounts({ ...cloneCounts(), "super-spy": 99 }).ok,
    true,
  );
  assert.equal(
    validateVirusCounts({ ...cloneCounts(), "super-spy": 0 }).ok,
    true,
  );

  const zeros = Object.fromEntries(VIRUS_CARD_TYPES.map((t) => [t.id, 0]));
  const empty = validateVirusCounts(zeros);
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, "EMPTY");
  assert.deepEqual(validateVirusCounts({ ...zeros, jump: 1 }), {
    ok: true,
    total: 1,
  });
  // ทุกชนิด 99 ใบ ใช้ได้ (ผ่านเพดานพอดี)
  const maxed = Object.fromEntries(
    VIRUS_CARD_TYPES.map((t) => [t.id, MAX_VIRUS_PER_TYPE]),
  );
  assert.deepEqual(validateVirusCounts(maxed), { ok: true, total: 21 * 99 });
});

test("canDealVirus: ผู้เล่น x 2 ใบ ขอบเขตพอดี/ขาดหนึ่งใบ ทุกจำนวนผู้เล่น 2-6 / ค่าเริ่มต้นแจกได้ทุกจำนวน", () => {
  for (let players = 2; players <= 6; players += 1) {
    assert.deepEqual(canDealVirus(DEFAULT_VIRUS_COUNTS, players), { ok: true });
    const zeros = Object.fromEntries(VIRUS_CARD_TYPES.map((t) => [t.id, 0]));
    const exact = { ...zeros, jump: players * 2 };
    assert.deepEqual(canDealVirus(exact, players), { ok: true });
    const short = { ...zeros, jump: players * 2 - 1 };
    const result = canDealVirus(short, players);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "NOT_ENOUGH_CARDS");
    assert.equal(result.needed, players * 2);
    assert.equal(result.total, players * 2 - 1);
    assert.ok(result.message.includes(String(players * 2)));
  }
  // ผู้เล่นเยอะกว่าการ์ด
  assert.equal(canDealVirus(DEFAULT_VIRUS_COUNTS, 22).ok, false);
  assert.equal(canDealVirus(DEFAULT_VIRUS_COUNTS, 21).ok, true);
});

test("buildVirusDeck: ตามจำนวนต่อชนิด / uid vr-<id>-<k> ไม่ซ้ำ / เรียงตามชนิด / ไม่แก้ตารางจำนวน", () => {
  const counts = cloneCounts();
  const snapshot = JSON.stringify(counts);
  const deck = buildVirusDeck(counts);
  assert.equal(deck.length, 42);
  assert.equal(JSON.stringify(counts), snapshot);
  assert.equal(new Set(uids(deck)).size, 42);
  for (const type of VIRUS_CARD_TYPES) {
    const ofType = deck.filter((c) => c.typeId === type.id);
    assert.equal(ofType.length, counts[type.id], type.id);
    assert.deepEqual(
      uids(ofType),
      Array.from(
        { length: counts[type.id] },
        (_, k) => `vr-${type.id}-${k + 1}`,
      ),
    );
  }
  for (const item of deck) {
    assert.deepEqual(Object.keys(item).sort(), ["typeId", "uid"]);
  }
  // เรียงตามชนิดในตาราง: ลำดับ typeId ที่ปรากฏต้องเป็นลำดับเดียวกับตาราง
  const order = [];
  for (const item of deck) {
    if (order[order.length - 1] !== item.typeId) order.push(item.typeId);
  }
  assert.deepEqual(
    order,
    VIRUS_CARD_TYPES.map((t) => t.id),
  );
});

test("buildVirusDeck: ชนิดที่ตั้ง 0 ไม่ปรากฏ / ชนิดที่ไม่มีในตารางนับเป็น 0 / ตารางว่าง → กองว่าง", () => {
  const counts = { ...cloneCounts(), jump: 0, genius: 0 };
  const deck = buildVirusDeck(counts);
  assert.equal(deck.length, 42 - 2 - 2);
  assert.equal(
    deck.some((c) => c.typeId === "jump" || c.typeId === "genius"),
    false,
  );
  assert.deepEqual(
    buildVirusDeck({ "i-take": 2 }).map((c) => c.uid),
    ["vr-i-take-1", "vr-i-take-2"],
  );
  assert.deepEqual(buildVirusDeck({}), []);
});

test("แจกมือ Virus 2 ใบด้วย createCardState: ทุกจำนวนผู้เล่น 2-6 ไม่ซ้ำใบ การ์ดครบ 42", () => {
  const deck = buildVirusDeck(DEFAULT_VIRUS_COUNTS);
  for (let players = 2; players <= 6; players += 1) {
    const state = createCardState(deck, players, VIRUS_HAND_SIZE, makeRng(7));
    assert.equal(state.hands.length, players);
    state.hands.forEach((hand) => assert.equal(hand.length, 2));
    assert.equal(state.drawPile.length, 42 - players * 2);
    assert.deepEqual(state.discardPile, []);
    assert.equal(countAllCards(state), 42);
    assert.equal(
      new Set([...uids(state.drawPile), ...state.hands.flatMap(uids)]).size,
      42,
    );
  }
});

test("ระบบกองเดิมใช้กับ Virus ได้: playCard ไปกองทิ้ง / drawToHand / refillHand (ชนิดไม่เปลี่ยน)", () => {
  const state = {
    drawPile: [card("d1", "jump"), card("d2", "genius")],
    discardPile: [],
    hands: [[card("a1", "i-take"), card("a2", "anti-virus")], [card("b1")]],
  };
  const played = playCard(state, 0, "a2");
  assert.equal(played.card.typeId, "anti-virus");
  assert.deepEqual(uids(played.state.discardPile), ["a2"]);
  const drawn = drawToHand(played.state, 0, 1, makeRng(1));
  assert.equal(drawn.drawn[0].typeId, "jump");
  const refill = refillHand(drawn.state, 0, 2, makeRng(1));
  assert.equal(refill.refilled, false);
});

// ----------------------------- topUpHand -----------------------------

test("topUpHand: มือเหลือ 1 ใบ → จั่ว 1 ใบจากหัวกอง ต่อท้ายมือ / มือว่าง → จั่ว 2 ใบ", () => {
  const state = deepFreeze({
    drawPile: mk("d1", "d2", "d3"),
    discardPile: mk("x1"),
    hands: [mk("a1"), [], mk("c1", "c2")],
  });
  const one = topUpHand(state, 0, 2, makeRng(1));
  assert.deepEqual(uids(one.state.hands[0]), ["a1", "d1"]);
  assert.deepEqual(uids(one.drawn), ["d1"]);
  assert.equal(one.reshuffled, false);
  assert.deepEqual(uids(one.state.drawPile), ["d2", "d3"]);
  assert.deepEqual(uids(one.state.discardPile), ["x1"]);
  assert.deepEqual(uids(one.state.hands[1]), []);
  assert.deepEqual(uids(one.state.hands[2]), ["c1", "c2"]);

  const two = topUpHand(state, 1, 2, makeRng(1));
  assert.deepEqual(uids(two.state.hands[1]), ["d1", "d2"]);
  assert.deepEqual(uids(two.drawn), ["d1", "d2"]);
  assert.deepEqual(uids(two.state.drawPile), ["d3"]);
  assert.deepEqual(uids(two.state.hands[0]), ["a1"]);
});

test("topUpHand: มือครบหรือเกินเป้าหมาย / เป้าหมาย 0 → ไม่ทำอะไร คืนสถานะเดิม", () => {
  const state = deepFreeze({
    drawPile: mk("d1", "d2"),
    discardPile: mk("x1"),
    hands: [mk("a1", "a2"), mk("b1", "b2", "b3")],
  });
  for (const [p, target] of [
    [0, 2],
    [1, 2],
    [0, 1],
    [0, 0],
  ]) {
    const result = topUpHand(state, p, target, makeRng(1));
    assert.equal(result.state, state);
    assert.deepEqual(result.drawn, []);
    assert.equal(result.reshuffled, false);
  }
});

test("topUpHand: กองจั่วหมดกลางทาง → จั่วที่เหลือก่อน แล้วสับกองทิ้งเป็นกองจั่ว (กองทิ้งว่าง) แล้วจั่วต่อ", () => {
  const state = deepFreeze({
    drawPile: mk("d1"),
    discardPile: mk("x1", "x2", "x3", "x4"),
    hands: [[]],
  });
  const result = topUpHand(state, 0, 2, makeRng(9));
  assert.equal(result.reshuffled, true);
  assert.equal(result.drawn.length, 2);
  assert.equal(result.drawn[0].uid, "d1");
  assert.deepEqual(uids(result.state.hands[0]), uids(result.drawn));
  assert.deepEqual(result.state.discardPile, []);
  assert.equal(result.state.drawPile.length, 3);
  assert.deepEqual(
    [...uids(result.state.drawPile), result.drawn[1].uid].sort(),
    ["x1", "x2", "x3", "x4"],
  );
  assert.equal(countAllCards(result.state), 5);
});

test("topUpHand: กองจั่วและกองทิ้งหมด → จั่วได้เท่าที่มี ไม่ error / ว่างหมด → ไม่ได้ใบเลย", () => {
  const some = topUpHand(
    deepFreeze({ drawPile: mk("d1"), discardPile: [], hands: [[]] }),
    0,
    2,
    makeRng(1),
  );
  assert.deepEqual(uids(some.state.hands[0]), ["d1"]);
  assert.equal(some.reshuffled, false);

  const none = topUpHand(
    deepFreeze({ drawPile: [], discardPile: [], hands: [mk("a1")] }),
    0,
    2,
    makeRng(1),
  );
  assert.deepEqual(uids(none.state.hands[0]), ["a1"]);
  assert.deepEqual(none.drawn, []);
  assert.equal(none.reshuffled, false);
});

test("topUpHand: ผู้เล่นผิด / เป้าหมายไม่ใช่จำนวนเต็มไม่ติดลบ → throw", () => {
  const state = deepFreeze({
    drawPile: mk("d1"),
    discardPile: [],
    hands: [[]],
  });
  assert.throws(() => topUpHand(state, 1, 2));
  assert.throws(() => topUpHand(state, -1, 2));
  assert.throws(() => topUpHand(state, 0.5, 2));
  assert.throws(() => topUpHand(state, 0, -1));
  assert.throws(() => topUpHand(state, 0, 1.5));
  assert.throws(() => topUpHand(state, 0, NaN));
  assert.throws(() => topUpHand(state, 0, "2"));
  assert.throws(() => topUpHand(state, 0, undefined));
});

// --------------------------- swapUnderDeck ---------------------------

test("swapUnderDeck: ใบที่เลือกไปท้ายกอง ใบบนสุดเข้ามือ (ต่อท้าย) มืออื่น/กองทิ้งไม่เปลี่ยน", () => {
  const state = deepFreeze({
    drawPile: mk("d1", "d2", "d3"),
    discardPile: mk("x1"),
    hands: [mk("a1", "a2"), mk("b1", "b2")],
  });
  const result = swapUnderDeck(state, 0, "a1", makeRng(1));
  assert.equal(result.card.uid, "a1");
  assert.equal(result.drawn.uid, "d1");
  assert.equal(result.reshuffled, false);
  assert.deepEqual(uids(result.state.hands[0]), ["a2", "d1"]);
  assert.deepEqual(uids(result.state.hands[1]), ["b1", "b2"]);
  assert.deepEqual(uids(result.state.drawPile), ["d2", "d3", "a1"]);
  assert.deepEqual(uids(result.state.discardPile), ["x1"]);
  assert.equal(countAllCards(result.state), countAllCards(state));
});

test("swapUnderDeck: กองจั่ว 1 ใบ สลับ 2 ครั้ง → ใบแรกที่ใส่ใต้กองต้องกลับมาครั้งที่สอง (สถานการณ์ทดสอบ 1)", () => {
  const state = deepFreeze({
    drawPile: mk("d1"),
    discardPile: [],
    hands: [mk("a1", "a2")],
  });
  const first = swapUnderDeck(state, 0, "a1", makeRng(1));
  assert.equal(first.drawn.uid, "d1");
  assert.deepEqual(uids(first.state.hands[0]), ["a2", "d1"]);
  assert.deepEqual(uids(first.state.drawPile), ["a1"]);
  const second = swapUnderDeck(first.state, 0, "d1", makeRng(1));
  assert.equal(second.drawn.uid, "a1"); // ใบแรกที่ใส่ใต้กองกลับมา
  assert.deepEqual(uids(second.state.hands[0]), ["a2", "a1"]);
  assert.deepEqual(uids(second.state.drawPile), ["d1"]);
});

test("swapUnderDeck: ใบที่ใส่ใต้กองถูกจั่วหลังใบอื่นในกองทุกใบเสมอ (กองยาว n ใบ ต้องวนครบ n ครั้งถึงกลับมา)", () => {
  for (let n = 1; n <= 6; n += 1) {
    let state = {
      drawPile: Array.from({ length: n }, (_, k) => card(`d${k + 1}`)),
      discardPile: [],
      hands: [mk("a1", "a2")],
    };
    state = swapUnderDeck(state, 0, "a1", makeRng(1)).state; // a1 ลงใต้กอง
    // สลับใบที่เพิ่งจั่วมา (ใบท้ายมือ) ไปเรื่อย ๆ: ใบอื่นทั้งหมดต้องออกมาก่อน a1
    const seen = [];
    for (let k = 0; k < n; k += 1) {
      const last = state.hands[0][state.hands[0].length - 1];
      seen.push(last.uid);
      const r = swapUnderDeck(state, 0, last.uid, makeRng(1));
      state = r.state;
    }
    assert.deepEqual(
      seen,
      Array.from({ length: n }, (_, k) => `d${k + 1}`),
      `n=${n}`,
    );
    assert.equal(state.hands[0][state.hands[0].length - 1].uid, "a1", `n=${n}`);
  }
});

test("swapUnderDeck: กองจั่วว่างแต่กองทิ้งมี → สับกองทิ้งเป็นกองจั่วก่อน แล้วใส่ใบที่เลือกใต้กอง แล้วจั่ว 1 ใบ (สถานการณ์ทดสอบ 3)", () => {
  const state = deepFreeze({
    drawPile: [],
    discardPile: mk("x1", "x2", "x3"),
    hands: [mk("a1", "a2")],
  });
  const result = swapUnderDeck(state, 0, "a1", makeRng(4));
  assert.equal(result.reshuffled, true);
  assert.deepEqual(result.state.discardPile, []);
  // ใบที่จั่วมาต้องมาจากกองทิ้งเดิม (ไม่ใช่ a1 เพราะ a1 ถูกใส่ใต้กองหลังสับ)
  assert.ok(["x1", "x2", "x3"].includes(result.drawn.uid));
  assert.deepEqual(uids(result.state.hands[0]), ["a2", result.drawn.uid]);
  // กองจั่วใหม่ = x ที่เหลือ 2 ใบ แล้วตามด้วย a1 ที่ท้ายกอง
  assert.equal(result.state.drawPile.length, 3);
  assert.equal(result.state.drawPile[2].uid, "a1");
  assert.deepEqual(
    [
      result.drawn.uid,
      result.state.drawPile[0].uid,
      result.state.drawPile[1].uid,
    ].sort(),
    ["x1", "x2", "x3"],
  );
  assert.equal(countAllCards(result.state), 5); // มือ 2 + กองทิ้ง 3 ก่อนสลับ = 5 ใบ ต้องไม่เปลี่ยน
});

test("swapUnderDeck: กองจั่วและกองทิ้งว่างทั้งคู่ → ได้ใบเดิมกลับมา (ยอมรับ) ไม่สับ ไม่ error", () => {
  const state = deepFreeze({
    drawPile: [],
    discardPile: [],
    hands: [mk("a1", "a2"), mk("b1", "b2")],
  });
  const result = swapUnderDeck(state, 1, "b1", makeRng(1));
  assert.equal(result.reshuffled, false);
  assert.equal(result.card.uid, "b1");
  assert.equal(result.drawn.uid, "b1");
  assert.deepEqual(uids(result.state.hands[1]), ["b2", "b1"]); // ไปท้ายมือ
  assert.deepEqual(result.state.drawPile, []);
  assert.deepEqual(result.state.discardPile, []);
  assert.deepEqual(uids(result.state.hands[0]), ["a1", "a2"]);
});

test("swapUnderDeck: ไม่มีการ์ดนี้ในมือ / ใบของคนอื่น / ผู้เล่นผิด → throw (และไม่แก้สถานะเดิม)", () => {
  const state = deepFreeze({
    drawPile: mk("d1"),
    discardPile: mk("x1"),
    hands: [mk("a1"), mk("b1")],
  });
  assert.throws(() => swapUnderDeck(state, 0, "b1"));
  assert.throws(() => swapUnderDeck(state, 0, "zzz"));
  assert.throws(() => swapUnderDeck(state, 0, "d1")); // อยู่ในกองจั่ว ไม่ใช่มือ
  assert.throws(() => swapUnderDeck(state, 2, "a1"));
  assert.throws(() => swapUnderDeck(state, -1, "a1"));
});

test("ฟังก์ชันใหม่ไม่แก้สถานะเดิม (ส่งสถานะที่ถูกล็อกเข้าไปได้) และคืนอาร์เรย์ใหม่ทุกครั้ง", () => {
  const state = deepFreeze({
    drawPile: mk("d1", "d2"),
    discardPile: mk("x1"),
    hands: [mk("a1"), mk("b1", "b2")],
  });
  const a = topUpHand(state, 0, 2, makeRng(1));
  const b = swapUnderDeck(state, 1, "b1", makeRng(1));
  assert.notEqual(a.state.hands, state.hands);
  assert.notEqual(a.state.hands[1], state.hands[1]);
  assert.notEqual(b.state.drawPile, state.drawPile);
  assert.notEqual(b.state.hands[0], state.hands[0]);
  // สถานะเดิมยังเหมือนเดิม
  assert.deepEqual(uids(state.drawPile), ["d1", "d2"]);
  assert.deepEqual(uids(state.hands[0]), ["a1"]);
  assert.deepEqual(uids(state.hands[1]), ["b1", "b2"]);
});

test("ฟังก์ชันใหม่ไม่ใช้ randomFn เมื่อไม่ต้องสับ (กองจั่วพอ) และสับ 1 ครั้งเมื่อกองจั่วหมด", () => {
  let calls = 0;
  const counting = () => {
    calls += 1;
    return 0.5;
  };
  const enough = {
    drawPile: mk("d1", "d2", "d3"),
    discardPile: mk("x1", "x2"),
    hands: [[], mk("b1", "b2")],
  };
  topUpHand(enough, 0, 2, counting);
  swapUnderDeck(enough, 1, "b1", counting);
  assert.equal(calls, 0);

  const empty = {
    drawPile: [],
    discardPile: mk("x1", "x2", "x3"),
    hands: [mk("a1")],
  };
  swapUnderDeck(empty, 0, "a1", counting);
  assert.equal(calls, 2); // สับ 3 ใบ = เรียก randomFn 2 ครั้ง
});

// ---------------------------------------------------------------------------
// ส่วนที่ 2: ผู้ตรวจอิสระ
// แบบจำลองเก็บเฉพาะรายการ uid ใช้ตัวสับของตัวเอง (เมล็ดเดียวกัน) จึงเทียบ "ลำดับการ์ดตรงทุกใบ" ได้ทุกขั้น
// ---------------------------------------------------------------------------
console.log(
  "\nส่วนที่ 2: ผู้ตรวจอิสระ (จำลองด้วยรายการ uid เขียนแยกจากโค้ดเกม) เทียบกับ fuzz เกมสุ่ม 3,000 เกม",
);

test("fuzz: เล่น Virus / เติมมือให้ครบ 2 / สลับใต้กอง หลายพันครั้ง การ์ดไม่หาย ไม่ซ้ำ ชนิดไม่เปลี่ยน ตรงกับแบบจำลองทุกขั้น", () => {
  const rng = makeRng(20260101);
  const pick = (list) => list[Math.floor(rng() * list.length)];

  // ตัวสับของผู้ตรวจ (เขียนแยก): สับจากท้ายไปหน้า สลับกับตำแหน่งสุ่ม 0..i
  const modelShuffle = (list, rnd) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      let j = Math.floor(rnd() * (i + 1));
      if (j > i) j = i;
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  };

  const seen = {
    games: 0,
    uses: 0,
    topUps: 0,
    topUpNoop: 0,
    topUpReshuffle: 0,
    topUpMidReshuffle: 0,
    swaps: 0,
    swapReshuffle: 0,
    swapBothEmpty: 0,
    swapOneLeft: 0,
    swapBack: 0,
  };

  for (let g = 0; g < 3000; g += 1) {
    const playerCount = 2 + Math.floor(rng() * 5);

    // สุ่มจำนวนการ์ด: ครึ่งหนึ่งใช้กองเล็ก (พอแจกพอดี ถึง +8) อีกครึ่งใช้ค่าเริ่มต้น
    let counts;
    if (rng() < 0.5) {
      counts = Object.fromEntries(VIRUS_CARD_TYPES.map((t) => [t.id, 0]));
      const target = playerCount * 2 + Math.floor(rng() * 9);
      let total = 0;
      while (total < target) {
        counts[pick(VIRUS_CARD_TYPES).id] += 1;
        total += 1;
      }
    } else {
      counts = cloneCounts();
    }
    assert.equal(validateVirusCounts(counts).ok, true);
    assert.equal(canDealVirus(counts, playerCount).ok, true);

    const gameRng = makeRng(g + 1);
    const modelRng = makeRng(g + 1);
    const deck = buildVirusDeck(counts);
    let state = createCardState(deck, playerCount, 2, gameRng);
    const allUids = new Set(uids(deck));
    const typeOf = new Map(deck.map((c) => [c.uid, c.typeId]));

    // แบบจำลอง: แจกตามกติกา (สับกอง → คนที่ 0 ได้ 2 ใบแรก ...)
    const shuffled = uids(modelShuffle(deck, modelRng));
    const model = {
      draw: shuffled.slice(playerCount * 2),
      discard: [],
      hands: Array.from({ length: playerCount }, (_, p) =>
        shuffled.slice(p * 2, p * 2 + 2),
      ),
    };

    const sameAsModel = (where) => {
      assert.deepEqual(
        uids(state.drawPile),
        model.draw,
        `กองจั่วไม่ตรง ${where}`,
      );
      assert.deepEqual(
        uids(state.discardPile),
        model.discard,
        `กองทิ้งไม่ตรง ${where}`,
      );
      state.hands.forEach((hand, p) =>
        assert.deepEqual(
          uids(hand),
          model.hands[p],
          `มือ ${p} ไม่ตรง ${where}`,
        ),
      );
      const everything = [
        ...model.draw,
        ...model.discard,
        ...model.hands.flat(),
      ];
      assert.equal(
        everything.length,
        allUids.size,
        `จำนวนการ์ดเปลี่ยน ${where}`,
      );
      assert.equal(
        new Set(everything).size,
        allUids.size,
        `มีการ์ดซ้ำ ${where}`,
      );
      for (const uid of everything)
        assert.equal(allUids.has(uid), true, `มีการ์ดแปลกปลอม ${where}`);
      for (const c of [
        ...state.drawPile,
        ...state.discardPile,
        ...state.hands.flat(),
      ]) {
        assert.equal(c.typeId, typeOf.get(c.uid), `ชนิดการ์ดเปลี่ยน ${where}`);
      }
      assert.equal(countAllCards(state), allUids.size);
      model.hands.forEach((hand, p) =>
        assert.ok(hand.length <= 2, `มือ ${p} เกิน 2 ใบ ${where}`),
      );
    };
    sameAsModel(`เกม ${g} ตอนแจก`);

    const doTopUp = (p, step) => {
      const where = `เกม ${g} ขั้น ${step} เติมมือ`;
      const beforeDraw = [...model.draw];
      const beforeLen = model.hands[p].length;
      const result = topUpHand(state, p, 2, gameRng);
      const need = 2 - beforeLen;
      seen.topUps += 1;

      const drawn = [];
      let reshuffled = false;
      for (let k = 0; k < need; k += 1) {
        if (model.draw.length === 0) {
          if (model.discard.length === 0) break;
          model.draw = modelShuffle(model.discard, modelRng);
          model.discard = [];
          reshuffled = true;
        }
        drawn.push(model.draw.shift());
      }
      model.hands[p] = [...model.hands[p], ...drawn];
      state = result.state;

      if (need === 0) {
        seen.topUpNoop += 1;
        assert.equal(result.drawn.length, 0, where);
        assert.equal(result.reshuffled, false, where);
      } else {
        // เกมที่แจกครบตามกติกาไม่มีทางขาดการ์ด จึงต้องเติมได้ครบเสมอ
        assert.equal(drawn.length, need, `เติมไม่ครบ ${where}`);
        assert.deepEqual(uids(result.drawn), drawn, `ใบที่จั่วไม่ตรง ${where}`);
        assert.equal(result.reshuffled, reshuffled, `สถานะสับไม่ตรง ${where}`);
        assert.deepEqual(
          uids(result.drawn).slice(0, Math.min(need, beforeDraw.length)),
          beforeDraw.slice(0, Math.min(need, beforeDraw.length)),
          `ต้องจั่วจากหัวกองก่อน ${where}`,
        );
        if (reshuffled) {
          seen.topUpReshuffle += 1;
          if (beforeDraw.length > 0) seen.topUpMidReshuffle += 1;
          assert.deepEqual(
            state.discardPile,
            [],
            `สับแล้วกองทิ้งต้องว่าง ${where}`,
          );
        }
      }
      assert.equal(state.hands[p].length, 2, `มือต้องครบ 2 ${where}`);
      sameAsModel(where);
    };

    const doSwap = (p, step) => {
      const where = `เกม ${g} ขั้น ${step} สลับใต้กอง`;
      const uid = pick(model.hands[p]);
      const result = swapUnderDeck(state, p, uid, gameRng);
      seen.swaps += 1;

      let reshuffled = false;
      if (model.draw.length === 0 && model.discard.length > 0) {
        model.draw = modelShuffle(model.discard, modelRng);
        model.discard = [];
        reshuffled = true;
      }
      const lenBefore = model.draw.length; // ความยาวกองจั่ว (หลังสับ ก่อนใส่ใบใต้กอง)
      model.draw = [...model.draw, uid];
      const got = model.draw.shift();
      model.hands[p] = [...model.hands[p].filter((u) => u !== uid), got];
      state = result.state;

      assert.equal(result.card.uid, uid, where);
      assert.equal(result.drawn.uid, got, `ใบที่จั่วไม่ตรง ${where}`);
      assert.equal(result.reshuffled, reshuffled, `สถานะสับไม่ตรง ${where}`);
      if (reshuffled) seen.swapReshuffle += 1;

      // คุณสมบัติหลัก: ใบที่ใส่ใต้กองต้องอยู่ท้ายกองจั่วเสมอ (ยกเว้นกรณีกองว่างจนได้ใบเดิมกลับมา)
      if (lenBefore === 0) {
        seen.swapBothEmpty += 1;
        assert.equal(got, uid, `กองว่างทั้งคู่ต้องได้ใบเดิม ${where}`);
        assert.equal(state.drawPile.length, 0, where);
      } else {
        assert.notEqual(got, uid, `กองมีใบอื่นต้องไม่ได้ใบเดิม ${where}`);
        assert.equal(
          state.drawPile[state.drawPile.length - 1].uid,
          uid,
          `ใบที่ใส่ใต้กองต้องอยู่ท้ายกอง ${where}`,
        );
        if (lenBefore === 1) {
          seen.swapOneLeft += 1;
          assert.deepEqual(uids(state.drawPile), [uid], where);
        }
      }
      sameAsModel(where);
      return { uid, got };
    };

    let lastSwap = null; // เพื่อนับกรณี "สลับแล้วใบที่ใส่ใต้กองกลับมา"
    const steps = 25 + Math.floor(rng() * 35);
    for (let step = 0; step < steps; step += 1) {
      const roll = rng();
      const holders = model.hands
        .map((hand, p) => (hand.length > 0 ? p : -1))
        .filter((p) => p >= 0);

      if (roll < 0.35 && holders.length > 0) {
        // ใช้ Virus: ไปกองทิ้ง
        const p = pick(holders);
        const uid = pick(model.hands[p]);
        const result = playCard(state, p, uid);
        state = result.state;
        assert.equal(result.card.uid, uid);
        model.hands[p] = model.hands[p].filter((u) => u !== uid);
        model.discard = [...model.discard, uid];
        seen.uses += 1;
        sameAsModel(`เกม ${g} ขั้น ${step} ใช้ Virus`);
        if (rng() < 0.7) doTopUp(p, step);
      } else if (roll < 0.6) {
        doTopUp(Math.floor(rng() * playerCount), step);
      } else {
        // สลับใต้กอง: เฉพาะผู้เล่นที่มี Virus ครบ 2 ใบ (ตามกติกา V3)
        const full = model.hands
          .map((hand, p) => (hand.length === 2 ? p : -1))
          .filter((p) => p >= 0);
        if (full.length === 0) {
          doTopUp(Math.floor(rng() * playerCount), step);
          continue;
        }
        const p = pick(full);
        const result = doSwap(p, step);
        if (lastSwap && lastSwap.p === p && result.got === lastSwap.uid)
          seen.swapBack += 1;
        lastSwap = { p, uid: result.uid };
      }
    }
    seen.games += 1;
  }

  console.log(
    `    ครอบคลุม: เกม ${seen.games} | ใช้ Virus ${seen.uses} | เติมมือ ${seen.topUps} (มือครบแล้ว ${seen.topUpNoop}, สับกองทิ้ง ${seen.topUpReshuffle}, สับกลางทาง ${seen.topUpMidReshuffle}) | สลับใต้กอง ${seen.swaps} (สับกองทิ้ง ${seen.swapReshuffle}, กองว่างทั้งคู่ ${seen.swapBothEmpty}, เหลือ 1 ใบ ${seen.swapOneLeft}, ใบเดิมกลับมา ${seen.swapBack})`,
  );
  for (const key of [
    "uses",
    "topUps",
    "topUpNoop",
    "topUpReshuffle",
    "topUpMidReshuffle",
    "swaps",
    "swapReshuffle",
    "swapBothEmpty",
    "swapOneLeft",
    "swapBack",
  ]) {
    assert.ok(seen[key] > 20, `fuzz ไม่ครอบคลุมกรณี ${key} (${seen[key]})`);
  }
});

console.log(
  `\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`,
);
