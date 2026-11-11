// R2 — ทะเบียนพฤติกรรม Obstacle แยกตามชนิด
// movement.js ถามทะเบียนนี้แทนการเขียนชื่อชนิด (wall/hole) ลงในลูปเดิน
//
// จุดเชื่อม (hook) ที่ชนิดหนึ่งเลือกมีได้:
//   onBeforeEnter(ctx) — ก่อน Robo ก้าวเข้าช่อง (เช่น Wall)
//   onEnter(ctx)       — หลัง Robo ก้าวเข้าช่องแล้ว ไม่ว่าผ่านหรือลงพอดี (เช่น Hole)
//   ctx = { obstacle, obstacles, row, col }  (obstacle = ใบที่อยู่ในช่องนั้น)
// แต่ละ hook คืน null (ไม่มีผล) หรือ "ผล" มาตรฐาน:
//   { kind: "block", blockedBy }                       ขวาง (เฉพาะ onBeforeEnter)
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
import { oilBehavior } from "./oil.js";
import { scrapBehavior } from "./scrap.js";

const BEHAVIORS = {
  destroyer: destroyerBehavior,
  wall: wallBehavior,
  hole: holeBehavior,
  oil: oilBehavior,
  scrap: scrapBehavior,
};

export function getObstacleBehavior(typeId) {
  return Object.hasOwn(BEHAVIORS, typeId) ? BEHAVIORS[typeId] : null;
}
