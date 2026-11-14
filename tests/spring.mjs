// tests/spring.mjs — ทดสอบ The Spring และการทำงานร่วมกับชนิดอื่น (รันด้วย: node tests/spring.mjs)
// กติกา (OWNER ตัดสิน S1–S5): ดูหัวไฟล์ src/game/obstacles/types/spring.js
//   · Spring ทำงานเมื่อ Robo ลงพอดี/หยุดบนช่อง (ผ่านกลางทางไม่ทำงาน หยุดเพราะติด Wall ก็ทำงาน)
//   · ถอย 2 ช่องทิศตรงข้ามกับที่เข้ามา (ทิศหันคงเดิม) Spring ชำรุดทันที
//   · ถอยไปจบบน Spring อีกอัน → ดีดกลับ 1 ช่อง อันถัดไปลดอีก (2, 1, 0)
//   · ระหว่างถอย/ดีด ชนิดอื่นทำงานตามปกติ ตกแมพ = ตกแมพ
// ส่วนที่ 2: "ผู้ตรวจอิสระ" เขียนกติกาทุกชนิดแยกจากโค้ดเกม แล้วเทียบกับ applyMovementCommand บนสถานการณ์สุ่ม

import assert from "node:assert/strict";
import {
  applyMovementCommand,
  MOVEMENT_COMMANDS,
  createRobo,
} from "../src/game/movement/movement.js";
import {
  OBSTACLE_TYPES,
  getDamageDuration,
  isDamaged,
  damageObstacle,
  tickDamage,
  placeObstacle,
} from "../src/game/obstacles/obstacles.js";

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
const run = (robo, commandId, obstacles) =>
  applyMovementCommand(robo, cmd(commandId), 9, obstacles);

console.log("ส่วนที่ 1: ทดสอบกรณีเฉพาะ");

test("S1/S2: ลงพอดีบน Spring แล้วถอย 2 ช่องทิศตรงข้าม ทิศหันคงเดิม Spring ชำรุดทันที", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "spring", 6, 4),
  ]);
  assert.deepEqual(r.robo, { row: 8, col: 4, facing: "UP" });
  assert.equal(r.stepsTaken, 2);
  assert.equal(r.retreatSteps, 2);
  assert.deepEqual(r.bounces, [{ uid: "A", distance: 2 }]);
  assert.deepEqual(r.damageUids, ["A"]);
  assert.equal(r.crashed, false);
  assert.deepEqual(r.triggers, [
    { uid: "A", typeId: "spring", effect: "bounce" },
  ]);
});

test("S1: เดินผ่าน Spring กลางทางไม่ทำงาน", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus-plus", [
    ob("A", "spring", 7, 4),
  ]);
  assert.deepEqual(r.robo, { row: 5, col: 4, facing: "UP" });
  assert.deepEqual(r.bounces, []);
  assert.deepEqual(r.damageUids, []);
  assert.equal(r.retreatSteps, 0);
});

test("S1: ยืนบน Spring อยู่แล้วเดินออก / แค่หัน (ไม่ได้ก้าวเข้า) ไม่ทำงาน", () => {
  const spring = [ob("A", "spring", 6, 4)];
  const out = run({ row: 6, col: 4, facing: "UP" }, "walk", spring);
  assert.deepEqual(out.robo, { row: 5, col: 4, facing: "UP" });
  assert.deepEqual(out.bounces, []);
  const turnOnly = run({ row: 6, col: 4, facing: "UP" }, "turn-left", spring);
  assert.deepEqual(turnOnly.robo, { row: 6, col: 4, facing: "LEFT" });
  assert.deepEqual(turnOnly.bounces, []);
});

test("S1: หยุดบน Spring เพราะก้าวต่อไปติด Wall ก็ทำงาน (ถือว่าสิ้นสุดการเดิน)", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus-plus", [
    ob("A", "spring", 6, 4),
    ob("W", "wall", 5, 4),
  ]);
  assert.equal(r.blocked, true);
  assert.deepEqual(r.robo, { row: 8, col: 4, facing: "UP" });
  assert.equal(r.stepsTaken, 2);
  assert.equal(r.retreatSteps, 2);
  assert.deepEqual(
    r.triggers.map((t) => t.effect),
    ["block", "bounce"],
  );
});

test("S4: Spring 2 อันห่างกัน 1 ช่อง — อันแรกถอย 2 ไปลงบนอันที่สอง ดีดกลับ 1 ช่อง (สุทธิถอย 1)", () => {
  // A (5,4) กับ B (7,4) Robo เดินผ่าน B (ไม่ทำงาน) ไปลงบน A
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus-plus", [
    ob("A", "spring", 5, 4),
    ob("B", "spring", 7, 4),
  ]);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.equal(r.stepsTaken, 3);
  assert.equal(r.retreatSteps, 3);
  assert.deepEqual(r.bounces, [
    { uid: "A", distance: 2 },
    { uid: "B", distance: 1 },
  ]);
  assert.deepEqual(r.damageUids, ["A", "B"]);
});

test("S4: ถอยแล้วติด Wall ขณะยืนบน Spring อีกอัน → อันนั้นทำงาน ดีดกลับมาช่องของอันแรก (ที่ชำรุดแล้ว ไม่ทำงานซ้ำ)", () => {
  // Robo เริ่มบนช่อง B (4,4) หันลง เดิน 1 ก้าวไปลงบน A (5,4) ถอยขึ้น: ก้าวแรกลงบน B ก้าวที่สองติด Wall (3,4)
  const r = run({ row: 4, col: 4, facing: "DOWN" }, "walk", [
    ob("A", "spring", 5, 4),
    ob("B", "spring", 4, 4),
    ob("W", "wall", 3, 4),
  ]);
  assert.deepEqual(r.robo, { row: 5, col: 4, facing: "DOWN" });
  assert.equal(r.blocked, true);
  assert.deepEqual(r.bounces, [
    { uid: "A", distance: 2 },
    { uid: "B", distance: 1 },
  ]);
  assert.equal(r.retreatSteps, 2);
  assert.deepEqual(r.damageUids, ["A", "B"]);
});

test("S4: ต่อกัน 3 อัน ระยะ 2, 1, 0 (อันที่ 3 แค่ชำรุด ไม่ดีดต่อ)", () => {
  const springs = [
    ob("A", "spring", 5, 4),
    ob("B", "spring", 7, 4),
    ob("C", "spring", 6, 4),
  ];
  const r = run({ row: 8, col: 4, facing: "UP" }, "walk-plus-plus", springs);
  assert.deepEqual(r.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(r.bounces, [
    { uid: "A", distance: 2 },
    { uid: "B", distance: 1 },
    { uid: "C", distance: 0 },
  ]);
  assert.deepEqual(r.damageUids, ["A", "B", "C"]);
});

test("S3: Spring ที่ชำรุดไม่ทำงาน และครบ 2 รอบกลับมาใช้ได้", () => {
  const damaged = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "spring", 6, 4, 2),
  ]);
  assert.deepEqual(damaged.robo, { row: 6, col: 4, facing: "UP" });
  assert.deepEqual(damaged.bounces, []);
  const hit = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "spring", 6, 4),
  ]);
  let list = damageObstacle(
    [ob("A", "spring", 6, 4)],
    hit.damageUid,
    getDamageDuration("spring"),
  );
  assert.equal(list[0].damagedTurns, 2);
  list = tickDamage(list);
  assert.equal(isDamaged(list[0]), true);
  list = tickDamage(list);
  assert.equal(isDamaged(list[0]), false);
  assert.equal(
    run({ row: 8, col: 4, facing: "UP" }, "walk-plus", list).bounces.length,
    1,
  );
});

test("S2: หันก่อนแล้วเดิน — ถอยตามทิศที่หัน และทิศหันคงเดิม", () => {
  const r = run({ row: 8, col: 4, facing: "UP" }, "turn-right-plus", [
    ob("A", "spring", 8, 5),
  ]);
  assert.deepEqual(r.robo, { row: 8, col: 3, facing: "RIGHT" });
  assert.equal(r.retreatSteps, 2);
});

test("S5: ถอยไปเกินขอบกระดาน = ตกแมพ (Crash) กลับ Starting Point", () => {
  const r = run({ row: 0, col: 4, facing: "DOWN" }, "walk", [
    ob("A", "spring", 1, 4),
  ]);
  assert.equal(r.crashed, true);
  assert.deepEqual(r.robo, { row: 4, col: 4, facing: "DOWN" });
  assert.equal(r.stepsTaken, 1);
  assert.equal(r.retreatSteps, 1);
  assert.deepEqual(r.damageUids, ["A"]);
});

test("S5: Oil ระหว่างถอยเพิ่มก้าวไปทางถอย / Oil ที่ทำงานไปแล้วในคำสั่งเดียวกันถือว่าชำรุด ไม่ทำงานซ้ำ", () => {
  const fresh = run({ row: 6, col: 4, facing: "UP" }, "walk", [
    ob("A", "spring", 5, 4),
    ob("O", "oil", 7, 4),
  ]);
  assert.deepEqual(fresh.robo, { row: 8, col: 4, facing: "UP" });
  assert.equal(fresh.extraSteps, 1);
  assert.equal(fresh.retreatSteps, 3);
  assert.deepEqual(fresh.damageUids, ["A", "O"]);
  const used = run({ row: 8, col: 4, facing: "UP" }, "walk-plus", [
    ob("A", "spring", 5, 4),
    ob("O", "oil", 6, 4),
  ]);
  assert.deepEqual(used.robo, { row: 7, col: 4, facing: "UP" });
  assert.equal(used.extraSteps, 1);
  assert.equal(used.retreatSteps, 2);
  assert.deepEqual(used.damageUids, ["O", "A"]);
});

test("S5: Hole ระหว่างถอยวาร์ปตามปกติ (ทิศหันคงเดิม)", () => {
  const r = run({ row: 6, col: 4, facing: "UP" }, "walk", [
    ob("A", "spring", 5, 4),
    ob("H1", "hole", 7, 4),
    ob("H2", "hole", 0, 0),
  ]);
  assert.deepEqual(r.robo, { row: 0, col: 0, facing: "UP" });
  assert.equal(r.warp.toUid, "H2");
  assert.deepEqual(r.damageUids, ["A", "H2"]);
});

test("S5: Wall / Scrap / Destroyer ระหว่างถอยทำงานตามปกติ", () => {
  const wall = run({ row: 6, col: 4, facing: "UP" }, "walk", [
    ob("A", "spring", 5, 4),
    ob("W", "wall", 7, 4),
  ]);
  assert.deepEqual(wall.robo, { row: 6, col: 4, facing: "UP" });
  assert.equal(wall.blocked, true);
  assert.equal(wall.retreatSteps, 1);

  const scrap = run({ row: 6, col: 4, facing: "UP" }, "walk", [
    ob("A", "spring", 5, 4),
    ob("S", "scrap", 7, 4),
  ]);
  assert.deepEqual(scrap.robo, { row: 7, col: 4, facing: "UP" });
  assert.equal(scrap.stoppedBy, "scrap");
  assert.deepEqual(scrap.damageUids, ["A", "S"]);

  const destroyer = run({ row: 6, col: 4, facing: "UP" }, "walk", [
    ob("A", "spring", 5, 4),
    ob("D", "destroyer", 7, 4),
  ]);
  assert.equal(destroyer.destroyed, true);
  assert.deepEqual(destroyer.robo, { row: 4, col: 4, facing: "UP" });
  assert.deepEqual(destroyer.damageUids, ["A", "D"]);
});

console.log(
  "\nส่วนที่ 2: ผู้ตรวจอิสระ (เขียนกติกาแยกจากโค้ดเกม) เทียบกับ applyMovementCommand",
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

const DIRS = { UP: [-1, 0], RIGHT: [0, 1], DOWN: [1, 0], LEFT: [0, -1] };
const ORDER = ["UP", "RIGHT", "DOWN", "LEFT"];

// จำลองการเดินทีละก้าวด้วยโค้ดที่เขียนใหม่ทั้งหมด (ไม่เรียกฟังก์ชันของเกม)
function referenceSimulate(robo, command, size, obstacles) {
  const turn = { NONE: 0, RIGHT: 1, LEFT: 3, AROUND: 2 }[command.turn];
  const facing = ORDER[(ORDER.indexOf(robo.facing) + turn) % 4];
  const mid = (size - 1) / 2;
  const out = {
    crashed: false,
    blocked: false,
    primary: 0,
    retreat: 0,
    extra: 0,
    destroyed: false,
    returned: false,
    stoppedBy: null,
    damage: [],
    triggers: [],
    bounces: [],
    warpTo: null,
    pending: null,
  };
  const dead = new Set(
    obstacles.filter((o) => o.damagedTurns > 0).map((o) => o.uid),
  );
  let r = robo.row;
  let c = robo.col;
  const at = (rr, cc) => obstacles.find((o) => o.row === rr && o.col === cc);
  const kill = (o) => {
    dead.add(o.uid);
    out.damage.push(o.uid);
  };
  const toStart = () => {
    r = mid;
    c = mid;
  };

  // คืน { over: true } เมื่อเกิดผลที่จบทั้งคำสั่ง ไม่เช่นนั้นคืนจำนวนก้าวที่เดินได้ในช่วงนี้
  function walk(dr, dc, count, primary) {
    let left = count;
    let taken = 0;
    while (left > 0) {
      left -= 1;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
        out.crashed = true;
        toStart();
        return { over: true };
      }
      const o = at(nr, nc);
      if (o && o.typeId === "wall") {
        out.blocked = true;
        out.triggers.push([o.uid, "block"]);
        return { over: false, taken };
      }
      r = nr;
      c = nc;
      taken += 1;
      if (primary) out.primary += 1;
      else out.retreat += 1;
      if (!o || dead.has(o.uid)) continue;
      if (o.typeId === "oil") {
        kill(o);
        out.extra += 1;
        left += 1;
        out.triggers.push([o.uid, "extend"]);
        continue;
      }
      if (o.typeId === "scrap") {
        kill(o);
        out.stoppedBy = "scrap";
        out.triggers.push([o.uid, "stop"]);
        return { over: true };
      }
      if (o.typeId === "destroyer") {
        kill(o);
        out.destroyed = true;
        toStart();
        out.triggers.push([o.uid, "destroy"]);
        return { over: true };
      }
      if (o.typeId === "hole") {
        const dests = obstacles.filter(
          (x) => x.typeId === "hole" && x.uid !== o.uid && !dead.has(x.uid),
        );
        if (dests.length === 0) {
          kill(o);
          out.returned = true;
          toStart();
          out.triggers.push([o.uid, "return-to-start"]);
        } else if (dests.length === 1) {
          kill(dests[0]);
          out.warpTo = dests[0].uid;
          r = dests[0].row;
          c = dests[0].col;
          out.triggers.push([o.uid, "warp"]);
        } else {
          out.pending = dests.map((x) => x.uid);
          out.triggers.push([o.uid, "choose-warp"]);
        }
        return { over: true };
      }
    }
    return { over: false, taken };
  }

  let [dr, dc] = DIRS[facing];
  let chain = 0;
  let res = walk(dr, dc, Math.max(0, Math.floor(command.steps)), true);
  while (!res.over && res.taken > 0) {
    const o = at(r, c);
    if (!o || o.typeId !== "spring" || dead.has(o.uid)) break;
    const distance = Math.max(0, 2 - chain);
    kill(o);
    out.triggers.push([o.uid, "bounce"]);
    out.bounces.push([o.uid, distance]);
    if (distance === 0) break;
    dr = -dr;
    dc = -dc;
    chain += 1;
    res = walk(dr, dc, distance, false);
  }

  return {
    robo: { row: r, col: c, facing },
    crashed: out.crashed,
    blocked: out.blocked,
    stepsTaken: out.primary,
    retreatSteps: out.retreat,
    extraSteps: out.extra,
    destroyed: out.destroyed,
    returnedToStart: out.returned,
    stoppedBy: out.stoppedBy,
    damageUids: out.damage,
    triggers: out.triggers,
    bounces: out.bounces,
    warpTo: out.warpTo,
    pending: out.pending,
  };
}

function summarize(r) {
  return {
    robo: r.robo,
    crashed: r.crashed,
    blocked: r.blocked,
    stepsTaken: r.stepsTaken,
    retreatSteps: r.retreatSteps,
    extraSteps: r.extraSteps,
    destroyed: r.destroyed,
    returnedToStart: r.returnedToStart,
    stoppedBy: r.stoppedBy,
    damageUids: r.damageUids,
    triggers: r.triggers.map((t) => [t.uid, t.effect]),
    bounces: r.bounces.map((b) => [b.uid, b.distance]),
    warpTo: r.warp ? r.warp.toUid : null,
    pending: r.pendingWarp
      ? r.pendingWarp.destinations.map((d) => d.uid)
      : null,
  };
}

test("เทียบกับผู้ตรวจอิสระ 40,000 กรณี (Spring หนาแน่น ผสมทุกชนิด)", () => {
  const rng = makeRng(161803);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const typeIds = OBSTACLE_TYPES.map((t) => t.id);
  const weighted = [
    "spring",
    "spring",
    "spring",
    "spring",
    "spring",
    "spring",
    "spring",
    "wall",
    "wall",
    "oil",
    "oil",
    "oil",
    "scrap",
    "destroyer",
    "destroyer",
    "hole",
    "hole",
    "hole",
    ...typeIds.filter((id) => id !== "magnet"),
  ];
  const seen = {
    spring: 0,
    chain2: 0,
    chain3: 0,
    retreatOil: 0,
    retreatCrash: 0,
    retreatEnd: 0,
    blockedLand: 0,
  };

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
    let placed = [];
    const count = 2 + Math.floor(rng() * 9);
    for (let k = 0; k < count; k += 1) {
      const near = rng() < 0.8;
      const offset = () => Math.floor(rng() * 9) - 4;
      const row = near
        ? Math.min(size - 1, Math.max(0, robo.row + offset()))
        : Math.floor(rng() * size);
      const col = near
        ? Math.min(size - 1, Math.max(0, robo.col + offset()))
        : Math.floor(rng() * size);
      const result = placeObstacle(
        placed,
        { uid: `u${k}`, typeId: pick(weighted) },
        row,
        col,
        size,
        0,
      );
      if (result.ok) {
        placed = result.placed;
        if (rng() < 0.2)
          placed = damageObstacle(placed, `u${k}`, 1 + Math.floor(rng() * 3));
      }
    }
    // บางกรณีวาง Spring เรียงเป็นแถวจาก Robo (ห่าง 1–4 ช่อง) เพื่อให้เกิดทอด Spring บ่อย
    if (rng() < 0.45) {
      const [dr, dc] = DIRS[pick(ORDER)];
      for (let n = 0; n < 3; n += 1) {
        const dist = 1 + Math.floor(rng() * 4);
        const result = placeObstacle(
          placed,
          { uid: `line${n}`, typeId: "spring" },
          robo.row + dr * dist,
          robo.col + dc * dist,
          size,
          0,
        );
        if (result.ok) placed = result.placed;
      }
    }

    const command = pick(MOVEMENT_COMMANDS);
    const before = JSON.stringify(placed);
    const actual = applyMovementCommand(robo, command, size, placed);
    assert.equal(
      JSON.stringify(placed),
      before,
      "ห้ามแก้อาร์เรย์ obstacles เดิม",
    );
    const expected = referenceSimulate(robo, command, size, placed);
    assert.deepEqual(
      summarize(actual),
      expected,
      `กรณีที่ ${i}: ${JSON.stringify({ robo, command: command.id, size, placed })}`,
    );

    if (actual.bounces.length >= 1) seen.spring += 1;
    if (actual.bounces.length >= 2) seen.chain2 += 1;
    if (actual.bounces.length >= 3) seen.chain3 += 1;
    if (actual.bounces.length >= 1 && actual.extraSteps >= 1)
      seen.retreatOil += 1;
    if (actual.bounces.length >= 1 && actual.crashed) seen.retreatCrash += 1;
    if (actual.bounces.length >= 1 && actual.blocked) seen.blockedLand += 1;
    if (
      actual.bounces.length >= 1 &&
      (actual.destroyed ||
        actual.stoppedBy ||
        actual.warp ||
        actual.pendingWarp ||
        actual.returnedToStart)
    )
      seen.retreatEnd += 1;
  }

  for (const key of [
    "spring",
    "chain2",
    "chain3",
    "retreatOil",
    "retreatCrash",
    "retreatEnd",
    "blockedLand",
  ]) {
    assert.ok(seen[key] > 20, `เหตุการณ์ ${key} เกิดน้อยเกินไป (${seen[key]})`);
  }
  console.log(
    `    ครอบคลุม: Spring ทำงาน ${seen.spring} | ทอด 2 อัน ${seen.chain2} | ทอด 3 อัน ${seen.chain3} | ถอยผ่าน Oil ${seen.retreatOil} | ถอยตกแมพ ${seen.retreatCrash} | ถอยแล้วจบด้วยชนิดอื่น ${seen.retreatEnd} | ติด Wall ${seen.blockedLand}`,
  );
});

console.log(
  `\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`,
);