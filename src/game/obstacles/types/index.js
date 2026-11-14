// R2 — ทะเบียนพฤติกรรม Obstacle แยกตามชนิด
// movement.js ถามทะเบียนนี้แทนการเขียนชื่อชนิด (wall/hole) ลงในลูปเดิน
//
// จุดเชื่อม (hook) ที่ชนิดหนึ่งเลือกมีได้:
//   onBeforeEnter(ctx) — ก่อน Robo ก้าวเข้าช่อง (เช่น Wall)
//   onEnter(ctx)       — หลัง Robo ก้าวเข้าช่องแล้ว ไม่ว่าผ่านหรือลงพอดี (เช่น Hole)
//   onLand(ctx)        — เมื่อการเดินช่วงหนึ่งจบลงที่ช่องนั้น และ Robo ก้าวเข้าช่องนั้นในช่วงนี้ (เช่น Spring)
//                        ctx เพิ่ม chainIndex = จำนวน Spring ที่ทำงานมาก่อนในทอดเดียวกัน
//   ctx = { obstacle, obstacles, row, col }  (obstacle = ใบที่อยู่ในช่องนั้น ใช้กับ hook ที่ไม่ใช่ onSettle)
//   onSettle(ctx)      — หลังการเดินและผลอื่นทั้งหมดจบแล้ว (เรียกครั้งเดียวต่อคำสั่ง และหลังเลือกปลายทาง Hole เสร็จ) (เช่น Magnet)
//                        ctx = { robo, obstacles, boardSize } คืน null หรือ { robo, magnetEvents, damageUids, triggers }
// แต่ละ hook คืน null (ไม่มีผล) หรือ "ผล" มาตรฐาน:
//   { kind: "block", blockedBy }                       ขวาง (เฉพาะ onBeforeEnter)
//   { kind: "bounce", distance, damageUid }           (เฉพาะ onLand) ถอย/ดีด Robo distance ช่องไปทิศตรงข้ามกับที่เข้ามา
//                                                      แล้วให้ damageUid ชำรุด (distance = 0 คือแค่ชำรุด ไม่ขยับ)
//   { kind: "extend", extraSteps, damageUid }          ไม่หยุด: เพิ่มจำนวนก้าวของคำสั่งนี้ extraSteps ก้าว และให้ damageUid ชำรุด
//   { kind: "stop", damageUid }                        หยุดบนช่องนั้น (ก้าวที่เหลือยกเลิก) และให้ damageUid ชำรุด
//   { kind: "destroy", damageUid }                     Robo พังทันที: หยุด กลับ Starting Point คงทิศ และให้ damageUid ชำรุด
//                                                      (ผู้เรียกนับ Crash +1 เมื่อผลมี destroyed = true)
//   { kind: "return-to-start", damageUid }             หยุด แล้วกลับ Starting Point (ไม่นับ Crash) และให้ damageUid ชำรุด
//   { kind: "warp", row, col, warp, damageUid }        หยุด แล้ววาร์ปไป (row, col) และให้ damageUid ชำรุด
//   { kind: "choose-warp", pendingWarp }               หยุด แล้วรอผู้เล่นเลือกปลายทาง
// ผลชนิดอื่น (เดินเพิ่ม N, ถอยหลัง N ฯลฯ) จะเพิ่มตอนทำชนิดนั้น
// ชนิดที่ยังไม่ทำจะไม่อยู่ในทะเบียน = ไม่มีผลต่อการเดิน

import { wallBehavior } from "./wall.js";
import { destroyerBehavior } from "./destroyer.js";
import { holeBehavior } from "./hole.js";
import { magnetBehavior } from "./magnet.js";
import { oilBehavior } from "./oil.js";
import { scrapBehavior } from "./scrap.js";
import { springBehavior } from "./spring.js";

const BEHAVIORS = {
  destroyer: destroyerBehavior,
  wall: wallBehavior,
  hole: holeBehavior,
  magnet: magnetBehavior,
  oil: oilBehavior,
  scrap: scrapBehavior,
  spring: springBehavior,
};

export function getObstacleBehavior(typeId) {
  return Object.hasOwn(BEHAVIORS, typeId) ? BEHAVIORS[typeId] : null;
}

// พฤติกรรมของทุกชนิดที่มี hook onSettle (ตอนนี้มีเฉพาะ Magnet) เรียงตามลำดับในทะเบียน
export function getSettleBehaviors() {
  return Object.values(BEHAVIORS).filter(
    (behavior) => typeof behavior.onSettle === "function",
  );
}
