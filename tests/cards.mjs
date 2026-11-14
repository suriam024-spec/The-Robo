// tests/cards.mjs — ทดสอบระบบกอง/มือ/กองทิ้ง และ Movement Cards (รันด้วย: node tests/cards.mjs)
// กติกา (OWNER ตัดสิน M4.1): ดูหัวไฟล์ src/game/cards/deck.js และ movementCards.js
//   · Movement 10 ชนิด จำนวนต่อชนิดกำหนดได้ (ค่าเริ่มต้นรวม 40 ใบ) / ผู้เล่นละ 4 ใบ / กองจั่วกับกองทิ้งแยกกัน
//   · เล่นการ์ด → ไปกองทิ้ง / มือหมด → จั่ว 4 ใบ / กองจั่วหมดกลางทาง → สับกองทิ้งเป็นกองจั่วแล้วจั่วต่อ
// ส่วนที่ 2: "ผู้ตรวจอิสระ" จำลองสถานะด้วยรายการ uid ที่เขียนแยกจากโค้ดเกม แล้วเทียบกับ fuzz สุ่มเกมหลายพันเกม

import assert from "node:assert/strict";
import { MOVEMENT_COMMANDS } from "../src/game/movement/movement.js";
import {
  DEFAULT_MOVEMENT_COUNTS,
  MAX_CARDS_PER_TYPE,
  MOVEMENT_CARD_TYPES,
  MOVEMENT_HAND_SIZE,
  buildMovementDeck,
  canDealMovement,
  countMovementTotal,
  getCardCommand,
  validateMovementCounts,
} from "../src/game/cards/movementCards.js";
import {
  countAllCards,
  createCardState,
  drawToHand,
  playCard,
  refillHand,
  shuffle,
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

const card = (uid, typeId = "walk") => ({ uid, typeId });
const uids = (cards) => cards.map((item) => item.uid);
const cloneCounts = () => ({ ...DEFAULT_MOVEMENT_COUNTS });

console.log("ส่วนที่ 1: ทดสอบกรณีเฉพาะ");

test("ชนิดการ์ด: 10 ชนิดตรงกับ MOVEMENT_COMMANDS / ค่าเริ่มต้นรวม 40 ใบ Walk 10 ใบ / ผ่านการตรวจ", () => {
  const commandIds = MOVEMENT_COMMANDS.map((c) => c.id);
  assert.deepEqual(
    MOVEMENT_CARD_TYPES.map((t) => t.id),
    commandIds,
  );
  assert.deepEqual(Object.keys(DEFAULT_MOVEMENT_COUNTS), commandIds);
  assert.equal(commandIds.length, 10);
  assert.equal(countMovementTotal(DEFAULT_MOVEMENT_COUNTS), 40);
  assert.equal(DEFAULT_MOVEMENT_COUNTS.walk, 10);
  assert.equal(MOVEMENT_HAND_SIZE, 4);
  assert.deepEqual(validateMovementCounts(DEFAULT_MOVEMENT_COUNTS), {
    ok: true,
    total: 40,
  });
});

test("getCardCommand: การ์ดทุกชนิดให้คำสั่งเดินตรงกัน / ชนิดแปลกให้ null", () => {
  for (const command of MOVEMENT_COMMANDS) {
    assert.equal(getCardCommand({ uid: "x", typeId: command.id }), command);
  }
  assert.equal(getCardCommand({ uid: "x", typeId: "nope" }), null);
});

test("validateMovementCounts: ปฏิเสธค่าที่ผิดทุกแบบ พร้อมบอกชนิดที่ผิด", () => {
  const bad = (mutate, reason) => {
    const counts = cloneCounts();
    mutate(counts);
    const result = validateMovementCounts(counts);
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
    assert.equal(typeof result.message, "string");
    return result;
  };
  assert.equal(
    bad((c) => {
      c.walk = -1;
    }, "OUT_OF_RANGE").typeId,
    "walk",
  );
  assert.equal(
    bad((c) => {
      c["walk-plus"] = MAX_CARDS_PER_TYPE + 1;
    }, "OUT_OF_RANGE").typeId,
    "walk-plus",
  );
  assert.equal(
    bad((c) => {
      c["turn-left"] = 1.5;
    }, "NOT_INTEGER").typeId,
    "turn-left",
  );
  assert.equal(
    bad((c) => {
      c["turn-right"] = "3";
    }, "NOT_INTEGER").typeId,
    "turn-right",
  );
  assert.equal(
    bad((c) => {
      c["turn-around"] = NaN;
    }, "NOT_INTEGER").typeId,
    "turn-around",
  );
  assert.equal(
    bad((c) => {
      delete c["walk-plus-plus"];
    }, "NOT_INTEGER").typeId,
    "walk-plus-plus",
  );
  assert.equal(
    bad((c) => {
      c.fly = 1;
    }, "UNKNOWN_TYPE").typeId,
    "fly",
  );
  bad((c) => {
    for (const key of Object.keys(c)) c[key] = 0;
  }, "EMPTY");
  for (const value of [null, undefined, 5, "x", []]) {
    assert.equal(validateMovementCounts(value).ok, false);
  }
});

test("validateMovementCounts: ค่า 0 และค่าสูงสุดใช้ได้ (ชนิดไหนจะเป็น 0 ก็ได้)", () => {
  const counts = cloneCounts();
  for (const key of Object.keys(counts)) counts[key] = 0;
  counts.walk = MAX_CARDS_PER_TYPE;
  assert.deepEqual(validateMovementCounts(counts), {
    ok: true,
    total: MAX_CARDS_PER_TYPE,
  });
});

test("canDealMovement: พอแจกผู้เล่น 2-6 คนด้วยค่าเริ่มต้น / ไม่พอเมื่อน้อยกว่าผู้เล่น x 4", () => {
  for (let players = 2; players <= 6; players += 1) {
    assert.deepEqual(canDealMovement(DEFAULT_MOVEMENT_COUNTS, players), {
      ok: true,
    });
  }
  const small = Object.fromEntries(
    Object.keys(DEFAULT_MOVEMENT_COUNTS).map((k) => [k, 0]),
  );
  small.walk = 23;
  assert.equal(canDealMovement(small, 5).ok, true); // ต้องใช้ 20
  const fail = canDealMovement(small, 6); // ต้องใช้ 24
  assert.equal(fail.ok, false);
  assert.equal(fail.reason, "NOT_ENOUGH_CARDS");
  assert.equal(fail.needed, 24);
  assert.equal(fail.total, 23);
});

test("buildMovementDeck: จำนวนต่อชนิดตรงตาราง / uid ไม่ซ้ำและอ่านออก / ชนิดที่เป็น 0 ไม่มี", () => {
  const counts = cloneCounts();
  counts["turn-around"] = 0;
  counts.walk = 2;
  const deck = buildMovementDeck(counts);
  assert.equal(deck.length, countMovementTotal(counts));
  assert.equal(new Set(uids(deck)).size, deck.length);
  for (const type of MOVEMENT_CARD_TYPES) {
    assert.equal(
      deck.filter((c) => c.typeId === type.id).length,
      counts[type.id],
    );
  }
  assert.deepEqual(uids(deck).slice(0, 3), [
    "mv-walk-1",
    "mv-walk-2",
    "mv-walk-plus-1",
  ]);
  assert.deepEqual(
    buildMovementDeck(DEFAULT_MOVEMENT_COUNTS),
    buildMovementDeck(DEFAULT_MOVEMENT_COUNTS),
  );
});

test("shuffle: ไม่แก้อาร์เรย์เดิม / ได้การเรียงสับเปลี่ยนครบทุกใบ / ผลเหมือนเดิมเมื่อ randomFn เหมือนกัน", () => {
  const original = ["a", "b", "c", "d", "e", "f"];
  const frozen = Object.freeze([...original]);
  const out = shuffle(frozen, makeRng(1));
  assert.deepEqual([...out].sort(), original);
  assert.deepEqual(frozen, original);
  assert.deepEqual(
    shuffle(original, makeRng(7)),
    shuffle(original, makeRng(7)),
  );
  assert.notEqual(out, frozen);
  assert.deepEqual(shuffle([], makeRng(1)), []);
  assert.deepEqual(shuffle(["x"], makeRng(1)), ["x"]);
});

test("shuffle: randomFn ค่าสุดขอบ — ได้ 0 เสมอ / ได้ใกล้ 1 เสมอ ไม่หลุดขอบอาร์เรย์", () => {
  assert.deepEqual(
    shuffle(["a", "b", "c"], () => 0),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    shuffle(["a", "b", "c"], () => 0.999999999),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    shuffle(["a", "b", "c"], () => 1),
    ["a", "b", "c"],
  ); // กันค่าเกิน [0,1)
});

test("shuffle: สม่ำเสมอ (สับ 3 ใบ 60,000 ครั้ง ทุกลำดับได้ราว 10,000 ครั้ง)", () => {
  const rng = makeRng(2024);
  const tally = new Map();
  for (let i = 0; i < 60000; i += 1) {
    const key = shuffle(["a", "b", "c"], rng).join("");
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  assert.equal(tally.size, 6);
  for (const [key, count] of tally) {
    assert.ok(Math.abs(count - 10000) < 400, `${key} ได้ ${count} ครั้ง`);
  }
});

test("createCardState: แจกมือ 4 ใบให้ทุกคน 2-6 คน ไม่ซ้ำใบ / ตรงกับกองที่สับด้วยเมล็ดเดียวกัน / กองทิ้งว่าง", () => {
  const deck = buildMovementDeck(DEFAULT_MOVEMENT_COUNTS);
  for (let players = 2; players <= 6; players += 1) {
    const state = createCardState(deck, players, 4, makeRng(55));
    const expected = shuffle(deck, makeRng(55));
    assert.equal(state.hands.length, players);
    state.hands.forEach((hand, p) => {
      assert.equal(hand.length, 4);
      assert.deepEqual(hand, expected.slice(p * 4, p * 4 + 4));
    });
    assert.deepEqual(state.drawPile, expected.slice(players * 4));
    assert.deepEqual(state.discardPile, []);
    assert.equal(countAllCards(state), 40);
    assert.equal(
      new Set([...uids(state.drawPile), ...state.hands.flatMap(uids)]).size,
      40,
    );
  }
});

test("createCardState: การ์ดไม่พอแจก → throw / พอดีพอแจก → กองจั่วว่าง / ไม่แก้กองเดิม", () => {
  const deck = Object.freeze(
    buildMovementDeck(DEFAULT_MOVEMENT_COUNTS).slice(0, 23),
  );
  assert.throws(() => createCardState(deck, 6, 4, makeRng(1)));
  const exact = createCardState(deck.slice(0, 20), 5, 4, makeRng(1));
  assert.deepEqual(exact.drawPile, []);
  assert.equal(
    exact.hands.every((h) => h.length === 4),
    true,
  );
});

test("playCard: การ์ดย้ายจากมือไปกองทิ้ง (ต่อท้าย) มืออื่นไม่เปลี่ยน / ไม่มีการ์ดนี้ในมือ → throw", () => {
  const state = {
    drawPile: [card("d1")],
    discardPile: [card("x1")],
    hands: [[card("a1"), card("a2")], [card("b1")]],
  };
  deepFreeze(state);
  const first = playCard(state, 0, "a2");
  assert.equal(first.card.uid, "a2");
  assert.deepEqual(uids(first.state.hands[0]), ["a1"]);
  assert.deepEqual(uids(first.state.hands[1]), ["b1"]);
  assert.deepEqual(uids(first.state.discardPile), ["x1", "a2"]);
  assert.deepEqual(uids(first.state.drawPile), ["d1"]);
  const second = playCard(first.state, 1, "b1");
  assert.deepEqual(uids(second.state.discardPile), ["x1", "a2", "b1"]);
  assert.throws(() => playCard(state, 0, "b1")); // ใบของคนอื่น
  assert.throws(() => playCard(state, 0, "zzz"));
  assert.throws(() => playCard(state, 2, "a1"));
  assert.throws(() => playCard(state, -1, "a1"));
});

test("refillHand: มือยังมีการ์ด → ไม่ทำอะไร (สถานะเดิม) / มือหมด → จั่ว 4 ใบจากหัวกอง", () => {
  const state = {
    drawPile: ["1", "2", "3", "4", "5", "6"].map((u) => card(u)),
    discardPile: [card("x1")],
    hands: [[card("a1")], []],
  };
  deepFreeze(state);
  const keep = refillHand(state, 0, 4, makeRng(1));
  assert.equal(keep.state, state);
  assert.equal(keep.refilled, false);
  assert.deepEqual(keep.drawn, []);

  const filled = refillHand(state, 1, 4, makeRng(1));
  assert.equal(filled.refilled, true);
  assert.equal(filled.reshuffled, false);
  assert.deepEqual(uids(filled.state.hands[1]), ["1", "2", "3", "4"]);
  assert.deepEqual(uids(filled.drawn), ["1", "2", "3", "4"]);
  assert.deepEqual(uids(filled.state.drawPile), ["5", "6"]);
  assert.deepEqual(uids(filled.state.discardPile), ["x1"]); // ไม่แตะกองทิ้งเมื่อกองจั่วพอ
  assert.deepEqual(uids(filled.state.hands[0]), ["a1"]);
});

test("กองจั่วหมดกลางทาง: จั่วที่เหลือก่อน แล้วสับกองทิ้งเป็นกองจั่วใหม่ (กองทิ้งว่าง) แล้วจั่วต่อ", () => {
  const state = {
    drawPile: [card("d1"), card("d2")],
    discardPile: ["x1", "x2", "x3", "x4", "x5"].map((u) => card(u)),
    hands: [[]],
  };
  deepFreeze(state);
  const result = refillHand(state, 0, 4, makeRng(9));
  const shuffledDiscard = shuffle(state.discardPile, makeRng(9));
  assert.equal(result.reshuffled, true);
  assert.deepEqual(uids(result.state.hands[0]), [
    "d1",
    "d2",
    shuffledDiscard[0].uid,
    shuffledDiscard[1].uid,
  ]);
  assert.deepEqual(uids(result.state.drawPile), uids(shuffledDiscard.slice(2)));
  assert.deepEqual(result.state.discardPile, []);
  assert.equal(countAllCards(result.state), 7);
});

test("กองจั่วว่างพอดี: สับกองทิ้งเป็นกองจั่วใหม่ทั้งกอง", () => {
  const state = {
    drawPile: [],
    discardPile: ["x1", "x2", "x3", "x4", "x5", "x6"].map((u) => card(u)),
    hands: [[]],
  };
  const result = refillHand(state, 0, 4, makeRng(3));
  const shuffled = shuffle(state.discardPile, makeRng(3));
  assert.equal(result.reshuffled, true);
  assert.deepEqual(uids(result.state.hands[0]), uids(shuffled.slice(0, 4)));
  assert.deepEqual(uids(result.state.drawPile), uids(shuffled.slice(4)));
  assert.deepEqual(result.state.discardPile, []);
});

test("การ์ดไม่พอเติมมือ: จั่วได้เท่าที่มี / ไม่มีเลย → มือว่างต่อไป ไม่ error", () => {
  const some = refillHand(
    { drawPile: [card("d1")], discardPile: [card("x1")], hands: [[]] },
    0,
    4,
    makeRng(1),
  );
  assert.equal(some.state.hands[0].length, 2);
  assert.deepEqual(some.state.drawPile, []);
  assert.deepEqual(some.state.discardPile, []);
  assert.equal(some.reshuffled, true);

  const none = refillHand(
    { drawPile: [], discardPile: [], hands: [[], [card("b1")]] },
    0,
    4,
    makeRng(1),
  );
  assert.deepEqual(none.state.hands[0], []);
  assert.deepEqual(none.drawn, []);
  assert.equal(none.refilled, true);
  assert.equal(none.reshuffled, false);
});

test("drawToHand: จั่วเข้ามือที่มีการ์ดอยู่ได้ (ต่อท้าย) / จำนวน 0 ไม่ทำอะไร / ผู้เล่นผิด → throw", () => {
  const state = {
    drawPile: [card("d1"), card("d2")],
    discardPile: [],
    hands: [[card("a1")]],
  };
  const one = drawToHand(state, 0, 1, makeRng(1));
  assert.deepEqual(uids(one.state.hands[0]), ["a1", "d1"]);
  assert.deepEqual(uids(one.state.drawPile), ["d2"]);
  const zero = drawToHand(state, 0, 0, makeRng(1));
  assert.deepEqual(zero.state, state);
  assert.throws(() => drawToHand(state, 3, 1, makeRng(1)));
});

test("ทุกฟังก์ชันไม่แก้สถานะเดิม (ส่งสถานะที่ถูกล็อกเข้าไปได้ ไม่ error) และคืนอาร์เรย์ใหม่", () => {
  const state = deepFreeze(
    createCardState(
      buildMovementDeck(DEFAULT_MOVEMENT_COUNTS),
      3,
      4,
      makeRng(8),
    ),
  );
  const played = playCard(state, 1, state.hands[1][0].uid);
  const drawn = drawToHand(played.state, 1, 2, makeRng(8));
  assert.notEqual(played.state.hands, state.hands);
  assert.notEqual(drawn.state.drawPile, played.state.drawPile);
  assert.equal(countAllCards(drawn.state), 40);
});

console.log(
  "\nส่วนที่ 2: ผู้ตรวจอิสระ (จำลองด้วยรายการ uid เขียนแยกจากโค้ดเกม) เทียบกับ fuzz เกมสุ่ม 3,000 เกม",
);

test("เทียบกับผู้ตรวจอิสระ: เล่นการ์ด/เติมมือ/สับกองทิ้งหลายพันครั้ง การ์ดไม่หาย ไม่ซ้ำ ตรงกับแบบจำลองทุกขั้น", () => {
  const rng = makeRng(777);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const typeIds = MOVEMENT_CARD_TYPES.map((t) => t.id);
  const seen = {
    games: 0,
    plays: 0,
    refills: 0,
    reshuffles: 0,
    midReshuffle: 0,
    noopRefill: 0,
  };

  for (let g = 0; g < 3000; g += 1) {
    const playerCount = 2 + Math.floor(rng() * 5);
    const counts = Object.fromEntries(
      typeIds.map((id) => [id, Math.floor(rng() * 3)]),
    );
    while (
      countMovementTotal(counts) <
      playerCount * 4 + Math.floor(rng() * 4)
    ) {
      counts[pick(typeIds)] += 1;
    }
    assert.equal(canDealMovement(counts, playerCount).ok, true);

    const gameRng = makeRng(g + 1);
    const deck = buildMovementDeck(counts);
    let state = createCardState(deck, playerCount, 4, gameRng);
    const allUids = new Set(uids(deck));
    const typeOf = new Map(deck.map((c) => [c.uid, c.typeId]));

    // แบบจำลองของผู้ตรวจ: เก็บเฉพาะรายการ uid
    const model = {
      draw: uids(state.drawPile),
      discard: [],
      hands: state.hands.map(uids),
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
      // การ์ดครบทุกใบพอดี ไม่หาย ไม่ซ้ำ และชนิดไม่เปลี่ยน
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
    };
    sameAsModel(`เกม ${g} ตอนแจก`);

    const doRefill = (p, step) => {
      const wasEmpty = model.hands[p].length === 0;
      const before = { draw: [...model.draw], discard: [...model.discard] };
      const result = refillHand(state, p, 4, gameRng);
      state = result.state;
      seen.refills += 1;

      if (!wasEmpty) {
        assert.equal(result.refilled, false);
        assert.deepEqual(result.drawn, []);
        assert.equal(result.reshuffled, false);
        seen.noopRefill += 1;
        sameAsModel(`เกม ${g} ขั้น ${step} เติมมือที่ไม่ว่าง`);
        return;
      }

      const available = before.draw.length + before.discard.length;
      const want = Math.min(4, available);
      // เกมที่แจกครบตามกติกาไม่มีทางขาดการ์ด: มือคนอื่นถือรวมไม่เกิน 4 ใบต่อคน กองจั่ว+กองทิ้งจึงเหลือ >= 4 เสมอ
      assert.equal(
        want,
        4,
        `มือว่างต้องเติมครบ 4 ใบเสมอ เกม ${g} ขั้น ${step}`,
      );
      const fromDraw = Math.min(want, before.draw.length);
      const need = want - fromDraw;
      assert.equal(result.refilled, true);
      assert.equal(
        result.drawn.length,
        want,
        `จั่วผิดจำนวน เกม ${g} ขั้น ${step}`,
      );
      assert.deepEqual(
        uids(result.drawn).slice(0, fromDraw),
        before.draw.slice(0, fromDraw),
        "ต้องจั่วจากหัวกองก่อน",
      );

      if (need === 0) {
        assert.equal(
          result.reshuffled,
          false,
          `ไม่ควรสับกองทิ้ง เกม ${g} ขั้น ${step}`,
        );
        model.draw = before.draw.slice(fromDraw);
        model.discard = before.discard;
        model.hands[p] = uids(result.drawn);
      } else {
        assert.equal(
          result.reshuffled,
          true,
          `ต้องสับกองทิ้ง เกม ${g} ขั้น ${step}`,
        );
        const extra = uids(result.drawn).slice(fromDraw);
        const newDraw = uids(result.state.drawPile);
        // ใบที่จั่วเพิ่ม + กองจั่วใหม่ ต้องเป็นการสับเปลี่ยนของกองทิ้งเดิมพอดี
        assert.deepEqual(
          [...extra, ...newDraw].sort(),
          [...before.discard].sort(),
          "กองจั่วใหม่ต้องมาจากกองทิ้งเดิมทั้งหมด",
        );
        assert.deepEqual(
          result.state.discardPile,
          [],
          "สับแล้วกองทิ้งต้องว่าง",
        );
        model.draw = newDraw; // ลำดับหลังสับขึ้นกับ randomFn ใช้ลำดับจริงแต่ตรวจเนื้อหาข้างบนแล้ว
        model.discard = [];
        model.hands[p] = uids(result.drawn);
        seen.reshuffles += 1;
        if (fromDraw > 0) seen.midReshuffle += 1;
      }
      sameAsModel(`เกม ${g} ขั้น ${step} เติมมือ`);
    };

    const steps = 25 + Math.floor(rng() * 30);
    for (let step = 0; step < steps; step += 1) {
      const holders = model.hands
        .map((hand, p) => (hand.length > 0 ? p : -1))
        .filter((p) => p >= 0);
      if (holders.length === 0) {
        doRefill(Math.floor(rng() * playerCount), step);
        continue;
      }
      const p = pick(holders);
      const uid = pick(model.hands[p]);
      const result = playCard(state, p, uid);
      state = result.state;
      assert.equal(result.card.uid, uid);
      model.hands[p] = model.hands[p].filter((u) => u !== uid);
      model.discard = [...model.discard, uid];
      seen.plays += 1;
      sameAsModel(`เกม ${g} ขั้น ${step} เล่นการ์ด`);

      const roll = rng();
      if (roll < 0.75) doRefill(p, step);
      else if (roll < 0.85) doRefill(Math.floor(rng() * playerCount), step);
    }
    seen.games += 1;
  }

  console.log(
    `    ครอบคลุม: เกม ${seen.games} | เล่นการ์ด ${seen.plays} | เติมมือ ${seen.refills} (มือไม่ว่าง ${seen.noopRefill}) | สับกองทิ้ง ${seen.reshuffles} (สับกลางทาง ${seen.midReshuffle})`,
  );
  for (const key of [
    "plays",
    "refills",
    "reshuffles",
    "midReshuffle",
    "noopRefill",
  ]) {
    assert.ok(seen[key] > 20, `fuzz ไม่ครอบคลุมกรณี ${key} (${seen[key]})`);
  }
});

console.log(
  `\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`,
);
