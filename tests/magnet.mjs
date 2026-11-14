// tests/magnet.mjs — ทดสอบ The Magnet และการทำงานร่วมกับชนิดอื่น (รันด้วย: node tests/magnet.mjs)
// กติกา (OWNER ตัดสิน M1–M3 + Q4): ดูหัวไฟล์ src/game/obstacles/types/magnet.js
//   · Aura = 8 ช่องรอบ Magnet (รวมแนวทแยง) / Magnet ทำงาน "หลังเดินและผลอื่นทั้งหมดจบ" จากตำแหน่งสุดท้ายของ Robo
//   · ครอบ Robo 1 อัน → ดึง Robo ไปลงบนช่อง Magnet (ทิศคงเดิม) ชำรุด / ครอบ 2 อันขึ้นไป → Robo อยู่กับที่ ทุกอันชำรุด
//   · หลังดึงดึงต่อเป็นทอดได้ (Magnet ที่ชำรุดไม่ทำงาน) / ยืนบนช่อง Magnet → cancel ก่อน แล้วค่อยดูอันอื่น
//   · Hole ที่ต้องเลือกปลายทาง: ยังไม่ settle จนกว่าจะเรียก finishHoleWarp
// ส่วนที่ 2: "ผู้ตรวจอิสระ" เขียนกติกา settle แยกจากโค้ดเกม แล้วเทียบบนสถานการณ์สุ่ม (Magnet หนาแน่น ผสมทุกชนิด)
//   ใช้ข้อเท็จจริงว่า Magnet ไม่มี hook ระหว่างเดิน: ผลเดินบนกระดาน "ที่ตัด Magnet ออก" ต้องเท่ากับผลก่อน settle

import assert from "node:assert/strict";
import {
  applyMovementCommand,
  completeHoleWarp,
  finishHoleWarp,
  MOVEMENT_COMMANDS,
  createRobo,
} from "../src/game/movement/movement.js";
import {
  OBSTACLE_TYPES,
  getDamageDuration,
  placeObstacle,
  damageObstacle,
} from "../src/game/obstacles/obstacles.js";
import { isInMagnetAura } from "../src/game/obstacles/types/magnet.js";
import { getObstacleBehavior } from "../src/game/obstacles/types/index.js";

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

const cmd = (id) => MOVEMENT_COMMANDS.find((c) => c.id === id);
const ob = (uid, typeId, row, col, damagedTurns = 0) => ({
  uid,
  typeId,
  row,
  col,
  ownerIndex: 0,
  damagedTurns,
});
const run = (robo, commandId, obstacles, size = 9) =>
  applyMovementCommand(robo, cmd(commandId), size, obstacles);
const effects = (r) => r.triggers.map((t) => `${t.uid}:${t.effect}`);

console.log("ส่วนที่ 1: ทดสอบกรณีเฉพาะ");

test("พื้นฐาน: Aura = 8 ช่องรอบ (รวมแนวทแยง) ไม่รวมช่องตัวเอง และห่าง 2 ช่องไม่ใช่ / ระยะชำรุด 1 Turn", () => {
  const m = ob("M", "magnet", 6, 6);
  let count = 0;
  for (let r = 3; r <= 9; r += 1) {
    for (let c = 3; c <= 9; c += 1) {
      const inside = isInMagnetAura(m, r, c);
      const expected =
        Math.abs(r - 6) <= 1 && Math.abs(c - 6) <= 1 && !(r === 6 && c === 6);
      assert.equal(inside, expected, `(${r},${c})`);
      if (inside) count += 1;
    }
  }
  assert.equal(count, 8);
  assert.equal(getDamageDuration("magnet"), 1);
});

test("Magnet ไม่มี hook ระหว่างเดิน (ไม่ขวาง ไม่หยุด) มีเฉพาะ onSettle", () => {
  const b = getObstacleBehavior("magnet");
  assert.equal(typeof b.onSettle, "function");
  assert.equal(b.onBeforeEnter, undefined);
  assert.equal(b.onEnter, undefined);
  assert.equal(b.onLand, undefined);
});

test("ไม่มี Magnet → magnetEvents ว่าง ผลเดินไม่เปลี่ยน", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", []);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(r.magnetEvents, []);
  assert.deepEqual(r.damageUids, []);
  assert.deepEqual(r.triggers, []);
});

test("ดึง: จบในระยะ (แนวทแยง) → ถูกดึงไปลงบนช่อง Magnet ทิศคงเดิม Magnet ชำรุด", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("M", "magnet", 5, 5),
  ]);
  assert.deepEqual(r.robo, { row: 5, col: 5, facing: "UP" });
  assert.equal(r.stepsTaken, 2);
  assert.equal(r.retreatSteps, 0);
  assert.deepEqual(r.damageUids, ["M"]);
  assert.equal(r.damageUid, "M");
  assert.deepEqual(r.triggers, [
    { uid: "M", typeId: "magnet", effect: "pull" },
  ]);
  assert.deepEqual(r.magnetEvents, [
    {
      uid: "M",
      effect: "pull",
      reason: "aura",
      fromRow: 6,
      fromCol: 4,
      toRow: 5,
      toCol: 5,
    },
  ]);
  assert.equal(r.crashed, false);
});

test("ดึง: Magnet ติดกันแนวตรง 4 ทิศ (หน้า/ข้าง/หลัง) ก็ดึง", () => {
  for (const [mr, mc] of [
    [5, 4],
    [7, 4],
    [6, 3],
    [6, 5],
  ]) {
    const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
      ob("M", "magnet", mr, mc),
    ]);
    // ช่อง (7,4)/(6,4)... Robo จบที่ (6,4): Magnet ที่ (7,4) อยู่ในเส้นทางก็ยังดึงกลับ
    assert.deepEqual(
      r.robo,
      { row: mr, col: mc, facing: "UP" },
      `Magnet ที่ (${mr},${mc})`,
    );
    assert.deepEqual(r.damageUids, ["M"]);
  }
});

test("เดินผ่าน Aura กลางทางแต่จบนอก Aura → ไม่ดึง", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus-plus", [
    ob("M", "magnet", 7, 3),
  ]);
  assert.deepEqual(r.robo, { row: 5, col: 4, facing: "UP" });
  assert.deepEqual(r.magnetEvents, []);
  assert.deepEqual(r.damageUids, []);
});

test("เดินผ่านช่อง Magnet กลางทาง แล้วจบข้างหน้าในระยะ → ถูกดึงกลับมาลงบนช่อง Magnet", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus-plus", [
    ob("M", "magnet", 6, 4),
  ]);
  assert.equal(r.stepsTaken, 3);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(
    r.magnetEvents.map((e) => e.effect),
    ["pull"],
  );
});

test("M1: อยู่ในระยะ Magnet 2 อัน → Robo อยู่กับที่ ทั้งคู่ชำรุด (cancel) เรียงตามลำดับในกระดาน", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "magnet", 5, 5),
    ob("B", "magnet", 7, 3),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(r.damageUids, ["A", "B"]);
  assert.deepEqual(effects(r), ["A:cancel", "B:cancel"]);
  assert.deepEqual(
    r.magnetEvents.map((e) => [e.uid, e.effect, e.reason, e.toRow]),
    [
      ["A", "cancel", "tie", null],
      ["B", "cancel", "tie", null],
    ],
  );
});

test("M1: อยู่ในระยะ Magnet 3 อัน → อยู่กับที่ ชำรุดทั้ง 3", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "magnet", 5, 5),
    ob("B", "magnet", 7, 3),
    ob("C", "magnet", 6, 5),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(r.damageUids, ["A", "B", "C"]);
});

test("M1: เสมอแล้วจบ ไม่ดึงต่อ แม้มี Magnet อื่นอยู่ใกล้ตำแหน่งนั้น", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "magnet", 5, 5),
    ob("B", "magnet", 7, 3),
    ob("Z", "magnet", 4, 6), // ไกล Robo (6,4) แต่ใกล้ A
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(r.damageUids, ["A", "B"]);
});

test("M2: ดึงต่อเป็นทอด A → B (แต่ละอันชำรุด Robo ไปจบที่ช่อง B)", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk", [
    ob("A", "magnet", 6, 5),
    ob("B", "magnet", 5, 6),
  ]);
  // Robo จบ (7,4): ใกล้ A (6,5) เท่านั้น → ไปช่อง A → ใกล้ B (5,6) → ไปช่อง B
  assert.deepEqual(r.robo, { row: 5, col: 6, facing: "UP" });
  assert.deepEqual(r.damageUids, ["A", "B"]);
  assert.deepEqual(effects(r), ["A:pull", "B:pull"]);
  assert.deepEqual(
    r.magnetEvents.map((e) => [e.fromRow, e.fromCol, e.toRow, e.toCol]),
    [
      [7, 4, 6, 5],
      [6, 5, 5, 6],
    ],
  );
});

test("M2: ทอด 3 อัน", () => {
  const r = run({ row: 8, col: 4, facing: "LEFT" }, "turn-left", [
    ob("A", "magnet", 7, 5),
    ob("B", "magnet", 6, 6),
    ob("C", "magnet", 5, 7),
  ]);
  // Robo อยู่ (8,4) หัน LEFT → turn-left หันเป็น DOWN ตำแหน่งไม่เปลี่ยน ใกล้ A (7,5) เท่านั้น
  assert.deepEqual(r.robo, { row: 5, col: 7, facing: "DOWN" });
  assert.deepEqual(r.damageUids, ["A", "B", "C"]);
});

test("M2: ทอดหยุดเมื่อ Magnet อันถัดไปชำรุดอยู่ (ไม่ดึง)", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk", [
    ob("A", "magnet", 6, 5),
    ob("B", "magnet", 5, 6, 1),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 5, facing: "UP" });
  assert.deepEqual(r.damageUids, ["A"]);
});

test("M2: ดึงไปลงที่ A แล้วในระยะ B และ C พร้อมกัน → เสมอ อยู่ที่ช่อง A ทั้ง B และ C ชำรุด", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk", [
    ob("A", "magnet", 6, 5),
    ob("B", "magnet", 5, 6),
    ob("C", "magnet", 7, 6),
  ]);
  // Robo (7,4): ใกล้ A (6,5) เท่านั้น (B,C ห่าง 2) → ช่อง A (6,5) ใกล้ B (5,6) และ C (7,6)
  assert.deepEqual(r.robo, { row: 6, col: 5, facing: "UP" });
  assert.deepEqual(r.damageUids, ["A", "B", "C"]);
  assert.deepEqual(effects(r), ["A:pull", "B:cancel", "C:cancel"]);
});

test("ยืนบนช่อง Magnet: ทำงาน (cancel) ชำรุด ไม่ดึง", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("M", "magnet", 6, 4),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(r.damageUids, ["M"]);
  assert.deepEqual(r.triggers, [
    { uid: "M", typeId: "magnet", effect: "cancel" },
  ]);
  assert.deepEqual(
    r.magnetEvents.map((e) => [e.effect, e.reason]),
    [["cancel", "on-cell"]],
  );
});

test("Q4: ยืนบนช่อง Magnet A และอยู่ในระยะ B → A cancel ก่อน แล้ว B ดึง Robo ไปหา B", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "magnet", 6, 4),
    ob("B", "magnet", 6, 5),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 5, facing: "UP" });
  assert.deepEqual(effects(r), ["A:cancel", "B:pull"]);
  assert.deepEqual(r.damageUids, ["A", "B"]);
});

test("Q4: ยืนบนช่อง A และอยู่ในระยะ B กับ C → A cancel ก่อน แล้ว B/C เสมอ อยู่กับที่", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "magnet", 6, 4),
    ob("B", "magnet", 6, 5),
    ob("C", "magnet", 6, 3),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(effects(r), ["A:cancel", "B:cancel", "C:cancel"]);
});

test("Magnet ชำรุดอยู่: ไม่ดึง ไม่นับเป็นเสมอ / ยืนบนช่อง Magnet ที่ชำรุดก็ไม่ทำอะไร", () => {
  const near = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("M", "magnet", 5, 5, 1),
  ]);
  assert.deepEqual(near.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(near.magnetEvents, []);
  const on = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("M", "magnet", 6, 4, 2),
  ]);
  assert.deepEqual(on.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(on.damageUids, []);
});

test("Magnet ชำรุด 1 อัน + ปกติ 1 อัน ครอบ Robo → ตัวปกติดึง (ไม่นับว่าเสมอ)", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("D", "magnet", 7, 3, 1),
    ob("M", "magnet", 5, 5),
  ]);
  assert.deepEqual(r.robo, { row: 5, col: 5, facing: "UP" });
  assert.deepEqual(r.damageUids, ["M"]);
});

test("ต่อจาก Scrap: Scrap หยุด Robo ก่อน แล้ว Magnet ค่อยดึง (ลำดับ damageUids: Scrap แล้ว Magnet)", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus-plus", [
    ob("S", "scrap", 7, 4),
    ob("M", "magnet", 7, 5),
  ]);
  assert.equal(r.stoppedBy, "scrap");
  assert.deepEqual(r.robo, { row: 7, col: 5, facing: "UP" });
  assert.deepEqual(r.damageUids, ["S", "M"]);
  assert.deepEqual(effects(r), ["S:stop", "M:pull"]);
});

test("ต่อจาก Spring: Spring ถอยแล้ว ถ้า Robo ยังอยู่ในระยะ Magnet ก็ยังดึง", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("SP", "spring", 6, 4),
    ob("M", "magnet", 8, 5),
  ]);
  assert.deepEqual(r.bounces, [{ uid: "SP", distance: 2 }]);
  assert.deepEqual(r.robo, { row: 8, col: 5, facing: "UP" });
  assert.deepEqual(r.damageUids, ["SP", "M"]);
});

test("ต่อจาก Oil: ดูจากตำแหน่งหลังก้าวเพิ่ม (ไม่ใช่ตำแหน่งระหว่างทาง)", () => {
  // walk จาก (8,4) → (7,4) เจอ Oil เดินเพิ่ม 1 → จบ (6,4)
  // Magnet (5,3) ครอบ (6,4) แต่ไม่ครอบ (7,4) → ต้องดึง
  const pull = run({ row: 8, col: 4, facing: "UP" }, "walk", [
    ob("O", "oil", 7, 4),
    ob("M", "magnet", 5, 3),
  ]);
  assert.equal(pull.extraSteps, 1);
  assert.deepEqual(pull.robo, { row: 5, col: 3, facing: "UP" });
  assert.deepEqual(pull.damageUids, ["O", "M"]);
  // Magnet (8,5) ครอบ (7,4) ระหว่างทาง แต่ไม่ครอบ (6,4) ที่จบ → ไม่ดึง
  const none = run({ row: 8, col: 4, facing: "UP" }, "walk", [
    ob("O", "oil", 7, 4),
    ob("M", "magnet", 8, 5),
  ]);
  assert.deepEqual(none.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(none.magnetEvents, []);
});

test("Hole อัตโนมัติ: Magnet ใกล้ Hole ต้นทางไม่ทำงาน แต่ปลายทางอยู่ในระยะ Magnet → ดึงไปหา Magnet นั้น", () => {
  const r = run({ row: 6, col: 4, facing: "UP" }, "walk", [
    ob("H1", "hole", 5, 4),
    ob("H2", "hole", 7, 7),
    ob("M0", "magnet", 5, 3), // ใกล้ต้นทาง (Robo ไม่ได้อยู่ที่นั่นตอนจบ)
    ob("M1", "magnet", 7, 8),
  ]);
  assert.ok(r.warp);
  assert.deepEqual(r.robo, { row: 7, col: 8, facing: "UP" });
  assert.deepEqual(r.damageUids, ["H2", "M1"]);
  assert.ok(!r.damageUids.includes("M0"));
});

test("Hole 0 ปลายทาง (กลับ Starting Point) และตกแมพ/พัง: ไม่มี Magnet ดึง", () => {
  // Magnet อยู่ห่าง Starting Point 2 ช่อง (นอก Locked Zone) ไม่ครอบ Starting Point
  const ring = [
    ob("M1", "magnet", 2, 4),
    ob("M2", "magnet", 6, 4),
    ob("M3", "magnet", 4, 2),
    ob("M4", "magnet", 4, 6),
  ];
  const hole = run({ row: 5, col: 4, facing: "UP" }, "walk-plus", [
    ob("H", "hole", 4, 4),
    ...ring,
  ]);
  assert.equal(hole.returnedToStart, true);
  assert.deepEqual(hole.robo, { row: 4, col: 4, facing: "UP" });
  assert.deepEqual(hole.magnetEvents, []);
  const fall = run({ row: 0, col: 4, facing: "UP" }, "walk", ring);
  assert.equal(fall.crashed, true);
  assert.deepEqual(fall.robo, { row: 4, col: 4, facing: "UP" });
  assert.deepEqual(fall.magnetEvents, []);
  const boom = run({ row: 6, col: 8, facing: "LEFT" }, "walk", [
    ob("D", "destroyer", 6, 7),
    ...ring,
  ]);
  assert.equal(boom.destroyed, true);
  assert.deepEqual(boom.robo, { row: 4, col: 4, facing: "LEFT" }); // คงทิศตามคำสั่ง
  assert.deepEqual(boom.magnetEvents, []);
});

test("Hole เลือกปลายทางเอง: ยังไม่ settle ตอนรอเลือก (Magnet ใกล้ Hole ต้นทางไม่ดึง) เรียก finishHoleWarp หลังเลือกแล้วจึงดึง", () => {
  const placed = [
    ob("H1", "hole", 5, 4),
    ob("H2", "hole", 7, 7),
    ob("H3", "hole", 1, 1),
    ob("M0", "magnet", 5, 3), // ติด Hole ต้นทาง
    ob("M2", "magnet", 7, 8), // ติด H2
  ];
  const r = run({ row: 6, col: 4, facing: "UP" }, "walk", placed);
  assert.ok(r.pendingWarp);
  assert.deepEqual(r.robo, { row: 5, col: 4, facing: "UP" });
  assert.deepEqual(r.magnetEvents, []);
  assert.deepEqual(r.damageUids, []);

  const toH2 = finishHoleWarp(r.robo, r.pendingWarp, "H2", placed, 9);
  assert.deepEqual(toH2.robo, { row: 7, col: 8, facing: "UP" });
  assert.deepEqual(toH2.damageUids, ["H2", "M2"]);
  assert.equal(toH2.damageUid, "H2");
  assert.deepEqual(toH2.triggers, [
    { uid: "M2", typeId: "magnet", effect: "pull" },
  ]);
  assert.equal(toH2.magnetEvents.length, 1);
  assert.deepEqual(
    toH2.warp,
    completeHoleWarp(r.robo, r.pendingWarp, "H2").warp,
  );

  const toH3 = finishHoleWarp(r.robo, r.pendingWarp, "H3", placed, 9);
  assert.deepEqual(toH3.robo, { row: 1, col: 1, facing: "UP" });
  assert.deepEqual(toH3.damageUids, ["H3"]);
  assert.deepEqual(toH3.magnetEvents, []);
});

test("finishHoleWarp: ไม่มี Magnet → เหมือน completeHoleWarp ทุกฟิลด์เดิม / ปลายทางผิด → throw", () => {
  const placed = [
    ob("H1", "hole", 5, 4),
    ob("H2", "hole", 7, 7),
    ob("H3", "hole", 1, 1),
  ];
  const r = run({ row: 6, col: 4, facing: "UP" }, "walk", placed);
  const base = completeHoleWarp(r.robo, r.pendingWarp, "H3");
  const fin = finishHoleWarp(r.robo, r.pendingWarp, "H3", placed, 9);
  assert.deepEqual(fin.robo, base.robo);
  assert.deepEqual(fin.warp, base.warp);
  assert.equal(fin.damageUid, base.damageUid);
  assert.throws(() => finishHoleWarp(r.robo, r.pendingWarp, "nope", placed, 9));
});

test("ยืนในระยะ Magnet อยู่แล้วแล้วสั่งหันอย่างเดียว → ถูกดึง (ตามกติกา 'ดูตำแหน่งสุดท้าย')", () => {
  const r = run({ row: 6, col: 4, facing: "UP" }, "turn-right", [
    ob("M", "magnet", 6, 5),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 5, facing: "RIGHT" });
  assert.deepEqual(effects(r), ["M:pull"]);
});

test("ไม่แก้อาร์เรย์ obstacles เดิม / ผลลัพธ์เป็นอาร์เรย์ใหม่ทุกครั้ง", () => {
  const placed = [ob("A", "magnet", 6, 5), ob("B", "magnet", 5, 6)];
  const snapshot = JSON.stringify(placed);
  const a = run({ row: 8, col: 4, facing: "UP" }, "walk", placed);
  const b = run({ row: 8, col: 4, facing: "UP" }, "walk", placed);
  assert.equal(JSON.stringify(placed), snapshot);
  assert.notEqual(a.magnetEvents, b.magnetEvents);
  assert.notEqual(a.damageUids, b.damageUids);
  assert.deepEqual(a, b);
});

test("Magnet ชำรุดแล้วครบ Turn กลับมาทำงานได้อีก (ชำรุด 1 Turn)", () => {
  const first = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("M", "magnet", 5, 5),
  ]);
  assert.deepEqual(first.damageUids, ["M"]);
  const recovered = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("M", "magnet", 5, 5, 0),
  ]);
  assert.deepEqual(recovered.robo, { row: 5, col: 5, facing: "UP" });
});

console.log(
  "\nส่วนที่ 2: ผู้ตรวจอิสระ (เขียนกติกา settle แยกจากโค้ดเกม) เทียบกับ applyMovementCommand / finishHoleWarp",
);

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

const ORDER = ["UP", "RIGHT", "DOWN", "LEFT"];

// ผู้ตรวจอิสระ: จำลองขั้น Magnet ด้วยโค้ดที่เขียนใหม่ทั้งหมด (ใช้ Map และสูตรระยะต่างจากโค้ดเกม)
// คืน { pos, log:[uid, effect, reason, fromR, fromC, toR, toC] }
function referenceSettle(start, magnets) {
  const live = new Map();
  for (const m of magnets) if (!(m.damagedTurns > 0)) live.set(m.uid, m);
  let r = start.row;
  let c = start.col;
  const log = [];
  for (let guard = 0; guard < 1000; guard += 1) {
    const list = [...live.values()];
    const onCell = list.filter((m) => m.row === r && m.col === c);
    if (onCell.length > 0) {
      const m = onCell[0];
      log.push([m.uid, "cancel", "on-cell", r, c, null, null]);
      live.delete(m.uid);
      continue;
    }
    const near = list.filter(
      (m) => (m.row - r) * (m.row - r) <= 1 && (m.col - c) * (m.col - c) <= 1,
    );
    if (near.length === 0) break;
    if (near.length > 1) {
      for (const m of near) {
        log.push([m.uid, "cancel", "tie", r, c, null, null]);
        live.delete(m.uid);
      }
      break;
    }
    const m = near[0];
    log.push([m.uid, "pull", "aura", r, c, m.row, m.col]);
    live.delete(m.uid);
    r = m.row;
    c = m.col;
  }
  return { row: r, col: c, log };
}

const flat = (events) =>
  events.map((e) => [
    e.uid,
    e.effect,
    e.reason,
    e.fromRow,
    e.fromCol,
    e.toRow,
    e.toCol,
  ]);

test("เทียบกับผู้ตรวจอิสระ 40,000 กรณี (Magnet หนาแน่น ผสมทุกชนิด)", () => {
  const rng = makeRng(314159);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const others = OBSTACLE_TYPES.map((t) => t.id).filter(
    (id) => id !== "magnet",
  );
  const baseTypes = [
    "wall",
    "wall",
    "oil",
    "oil",
    "oil",
    "scrap",
    "scrap",
    "destroyer",
    "hole",
    "hole",
    "hole",
    "spring",
    "spring",
    ...others,
  ];
  const seen = {
    pull: 0,
    tie: 0,
    onCell: 0,
    chain2: 0,
    chain3: 0,
    pendingChosen: 0,
    holePull: 0,
    afterScrap: 0,
    afterSpring: 0,
    afterOil: 0,
    skipDamaged: 0,
  };

  let n = 0;
  for (let i = 0; i < 40000; i += 1) {
    const size = pick([9, 11, 13]);
    const robo =
      rng() < 0.3
        ? createRobo(size, pick(ORDER))
        : {
            row: Math.floor(rng() * size),
            col: Math.floor(rng() * size),
            facing: pick(ORDER),
          };
    const command = pick(MOVEMENT_COMMANDS);

    // 1) กระดานที่ "ไม่มี Magnet"
    let base = [];
    const baseCount = 1 + Math.floor(rng() * 8);
    for (let k = 0; k < baseCount; k += 1) {
      const near = rng() < 0.8;
      const off = () => Math.floor(rng() * 9) - 4;
      const row = near
        ? Math.min(size - 1, Math.max(0, robo.row + off()))
        : Math.floor(rng() * size);
      const col = near
        ? Math.min(size - 1, Math.max(0, robo.col + off()))
        : Math.floor(rng() * size);
      const res = placeObstacle(
        base,
        { uid: `b${k}`, typeId: pick(baseTypes) },
        row,
        col,
        size,
        0,
      );
      if (res.ok) {
        base = res.placed;
        if (rng() < 0.2)
          base = damageObstacle(base, `b${k}`, 1 + Math.floor(rng() * 3));
      }
    }
    if (rng() < 0.3) {
      // เพิ่ม Hole ใกล้ Robo เพื่อให้เกิดกรณีรอเลือกปลายทางบ่อยขึ้น
      for (let k = 0; k < 3; k += 1) {
        const row = Math.min(
          size - 1,
          Math.max(0, robo.row + Math.floor(rng() * 7) - 3),
        );
        const col = Math.min(
          size - 1,
          Math.max(0, robo.col + Math.floor(rng() * 7) - 3),
        );
        const res = placeObstacle(
          base,
          { uid: `h${k}`, typeId: "hole" },
          row,
          col,
          size,
          0,
        );
        if (res.ok) base = res.placed;
      }
    }
    const pre = applyMovementCommand(robo, command, size, base);
    assert.deepEqual(
      pre.magnetEvents,
      [],
      "กระดานไม่มี Magnet ต้องไม่มี magnetEvents",
    );

    // 2) เพิ่ม Magnet: รอบ ๆ จุดที่ Robo จบ (และรอบปลายทาง Hole ที่เลือกได้) + สุ่มทั่วไป
    const aroundCells = [[pre.robo.row, pre.robo.col]];
    if (pre.pendingWarp)
      for (const d of pre.pendingWarp.destinations)
        aroundCells.push([d.row, d.col]);
    let placed = base;
    const magnetCount = 1 + Math.floor(rng() * 5);
    for (let k = 0; k < magnetCount; k += 1) {
      const [cr, cc] = pick(aroundCells);
      const spread = rng() < 0.75 ? 1 : 2;
      const row = Math.min(
        size - 1,
        Math.max(0, cr + Math.floor(rng() * (2 * spread + 1)) - spread),
      );
      const col = Math.min(
        size - 1,
        Math.max(0, cc + Math.floor(rng() * (2 * spread + 1)) - spread),
      );
      const res = placeObstacle(
        placed,
        { uid: `m${k}`, typeId: "magnet" },
        row,
        col,
        size,
        0,
      );
      if (res.ok) {
        placed = res.placed;
        if (rng() < 0.2) placed = damageObstacle(placed, `m${k}`, 1);
      }
    }
    const magnets = placed.filter((o) => o.typeId === "magnet");

    const before = JSON.stringify(placed);
    const actual = applyMovementCommand(robo, command, size, placed);
    assert.equal(
      JSON.stringify(placed),
      before,
      "ห้ามแก้อาร์เรย์ obstacles เดิม",
    );
    const where = `กรณีที่ ${i}: ${JSON.stringify({ robo, command: command.id, size, placed })}`;

    // Magnet ต้องไม่เปลี่ยนเส้นทางเดิน: ทุกฟิลด์ที่ไม่ใช่ผลของ settle ต้องเท่ากับผลบนกระดานที่ตัด Magnet ออก
    const keys = Object.keys(pre).filter(
      (k) =>
        ![
          "robo",
          "damageUids",
          "damageUid",
          "triggers",
          "magnetEvents",
        ].includes(k),
    );
    for (const k of keys)
      assert.deepEqual(actual[k], pre[k], `ฟิลด์ ${k} เปลี่ยน — ${where}`);
    assert.deepEqual(
      actual.damageUids.slice(0, pre.damageUids.length),
      pre.damageUids,
      where,
    );
    assert.deepEqual(
      actual.triggers.slice(0, pre.triggers.length),
      pre.triggers,
      where,
    );

    if (pre.pendingWarp) {
      // ยังรอเลือก: ห้าม settle
      assert.deepEqual(actual.robo, pre.robo, where);
      assert.deepEqual(actual.magnetEvents, [], where);
      assert.deepEqual(actual.damageUids, pre.damageUids, where);
      const dest = pick(pre.pendingWarp.destinations);
      const fin = finishHoleWarp(
        actual.robo,
        actual.pendingWarp,
        dest.uid,
        placed,
        size,
      );
      const landed = completeHoleWarp(
        actual.robo,
        actual.pendingWarp,
        dest.uid,
      );
      const ref = referenceSettle(
        { row: landed.robo.row, col: landed.robo.col },
        magnets,
      );
      assert.deepEqual(
        fin.robo,
        { row: ref.row, col: ref.col, facing: landed.robo.facing },
        where,
      );
      assert.deepEqual(flat(fin.magnetEvents), ref.log, where);
      assert.deepEqual(
        fin.damageUids,
        [landed.damageUid, ...ref.log.map((e) => e[0])],
        where,
      );
      assert.deepEqual(
        fin.triggers,
        ref.log.map((e) => ({ uid: e[0], typeId: "magnet", effect: e[1] })),
        where,
      );
      assert.deepEqual(fin.warp, landed.warp, where);
      seen.pendingChosen += 1;
      if (ref.log.some((e) => e[1] === "pull")) seen.holePull += 1;
    } else {
      const ref = referenceSettle(
        { row: pre.robo.row, col: pre.robo.col },
        magnets,
      );
      assert.deepEqual(
        actual.robo,
        { row: ref.row, col: ref.col, facing: pre.robo.facing },
        where,
      );
      assert.deepEqual(flat(actual.magnetEvents), ref.log, where);
      assert.deepEqual(
        actual.damageUids,
        [...pre.damageUids, ...ref.log.map((e) => e[0])],
        where,
      );
      assert.equal(
        actual.damageUid,
        actual.damageUids.length
          ? actual.damageUids[actual.damageUids.length - 1]
          : null,
        where,
      );
      assert.deepEqual(
        actual.triggers,
        [
          ...pre.triggers,
          ...ref.log.map((e) => ({
            uid: e[0],
            typeId: "magnet",
            effect: e[1],
          })),
        ],
        where,
      );
      const pulls = ref.log.filter((e) => e[1] === "pull").length;
      if (pulls >= 1) {
        seen.pull += 1;
        if (pre.stoppedBy === "scrap") seen.afterScrap += 1;
        if (pre.bounces.length > 0) seen.afterSpring += 1;
        if (pre.extraSteps > 0) seen.afterOil += 1;
      }
      if (pulls >= 2) seen.chain2 += 1;
      if (pulls >= 3) seen.chain3 += 1;
      if (ref.log.some((e) => e[2] === "tie")) seen.tie += 1;
      if (ref.log.some((e) => e[2] === "on-cell")) seen.onCell += 1;
    }
    if (magnets.some((m) => m.damagedTurns > 0)) seen.skipDamaged += 1;
    n += 1;
  }

  console.log(
    `    ครอบคลุม: ดึง ${seen.pull} | เสมอ ${seen.tie} | ยืนบนช่อง ${seen.onCell} | ทอด 2 อัน ${seen.chain2} | ทอด 3 อัน ${seen.chain3} | ` +
      `Hole เลือกเอง ${seen.pendingChosen} (แล้วดึง ${seen.holePull}) | หลัง Scrap ${seen.afterScrap} | หลัง Spring ${seen.afterSpring} | หลัง Oil ${seen.afterOil} | มี Magnet ชำรุด ${seen.skipDamaged}`,
  );
  assert.equal(n, 40000);
  for (const [name, count] of Object.entries(seen)) {
    assert.ok(count > 0, `fuzz ไม่ครอบคลุมกรณี ${name}`);
  }
});

console.log(
  `\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`,
);
