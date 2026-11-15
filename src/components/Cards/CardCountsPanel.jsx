// M4.1 / M4.2: หน้า Setup — กำหนดจำนวนการ์ดแต่ละชนิด (ไว้ปรับระหว่างทดสอบ)
// ใช้ได้ทั้ง Movement (kind="movement") และ Virus (kind="virus") — ต่างกันที่ชุดข้อมูล หัวข้อ และการจัดกลุ่ม
import {
  DEFAULT_MOVEMENT_COUNTS,
  MAX_CARDS_PER_TYPE,
  MOVEMENT_CARD_TYPES,
  MOVEMENT_HAND_SIZE,
  canDealMovement,
  countMovementTotal,
} from '../../game/cards/movementCards.js'
import {
  DEFAULT_VIRUS_COUNTS,
  MAX_VIRUS_PER_TYPE,
  VIRUS_CARD_TYPES,
  VIRUS_HAND_SIZE,
  canDealVirus,
  countVirusTotal,
} from '../../game/cards/virusCards.js'
import { describeCommand } from '../../utils/describe.js'

// ค่าตั้งของแต่ละชนิดการ์ด
const CONFIGS = {
  movement: {
    titleId: 'card-counts-title',
    stepLabel: 'GAME SETUP · 04',
    title: 'จำนวนการ์ด Movement',
    description:
      'กำหนดจำนวนการ์ดแต่ละชนิดในกองกลาง (ใช้กับเกมที่เริ่มต่อจากนี้ ค่าถูกจำไว้ในเบราว์เซอร์นี้) ค่าเริ่มต้นเป็นค่าชั่วคราวรอ Playtest',
    types: MOVEMENT_CARD_TYPES,
    max: MAX_CARDS_PER_TYPE,
    handSize: MOVEMENT_HAND_SIZE,
    defaults: DEFAULT_MOVEMENT_COUNTS,
    countTotal: countMovementTotal,
    canDeal: canDealMovement,
    describeType: describeCommand,
    groups: null,
  },
  virus: {
    titleId: 'virus-counts-title',
    stepLabel: 'GAME SETUP · 05',
    title: 'จำนวนการ์ด Virus',
    description:
      'กำหนดจำนวนการ์ด Virus แต่ละชนิดในกองกลาง (ใช้กับเกมที่เริ่มต่อจากนี้ ค่าถูกจำไว้ในเบราว์เซอร์นี้) ค่าเริ่มต้นเป็นค่าชั่วคราวตามความแรงของการ์ด รอ Playtest',
    types: VIRUS_CARD_TYPES,
    max: MAX_VIRUS_PER_TYPE,
    handSize: VIRUS_HAND_SIZE,
    defaults: DEFAULT_VIRUS_COUNTS,
    countTotal: countVirusTotal,
    canDeal: canDealVirus,
    describeType: (type) => type.summary,
    groups: [
      { kind: 'WITH', label: 'WITH · ใช้ร่วมกับ Movement' },
      { kind: 'HACK', label: 'HACK · ใช้หลังขั้นแลก Movement' },
    ],
  },
}

// แปลงข้อความจากช่องกรอกเป็นจำนวนเต็ม 0–max (ช่องว่างหรือพิมพ์ผิดนับเป็น 0)
function toCount(rawValue, max) {
  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.min(max, Math.max(0, parsed))
}

function CardCountsPanel({ kind = 'movement', counts, playerCount, onChange, onReset }) {
  const config = CONFIGS[kind]
  const total = config.countTotal(counts)
  const needed = playerCount * config.handSize
  const deal = config.canDeal(counts, playerCount)
  const defaultTotal = config.countTotal(config.defaults)

  function renderGrid(types) {
    return (
      <div className="test-command-grid">
        {types.map((type) => (
          <label className="test-command-button" key={type.id}>
            <span className="test-command-name">{type.label}</span>
            <span className="test-command-desc">{config.describeType(type)}</span>
            <input
              className="player-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={config.max}
              step={1}
              value={counts[type.id]}
              onChange={(event) => onChange(type.id, toCount(event.target.value, config.max))}
            />
          </label>
        ))}
      </div>
    )
  }

  return (
    <section className="setup-panel player-setup" aria-labelledby={config.titleId}>
      <div className="setup-copy">
        <span className="step-label">{config.stepLabel}</span>
        <h2 id={config.titleId}>{config.title}</h2>
        <p>{config.description}</p>
      </div>

      <div className="player-count">
        <div className="count-value" aria-live="polite">
          <strong>{total}</strong>
          <span>ใบ · ผู้เล่น {playerCount} คนใช้แจกมือ {needed} ใบ</span>
        </div>
      </div>

      {config.groups
        ? config.groups.map((group) => {
            const groupTypes = config.types.filter((type) => type.kind === group.kind)
            const groupTotal = groupTypes.reduce((sum, type) => sum + counts[type.id], 0)
            return (
              <div key={group.kind}>
                <div className="card-group-label">
                  {group.label} ({groupTypes.length} ชนิด · {groupTotal} ใบ)
                </div>
                {renderGrid(groupTypes)}
              </div>
            )
          })
        : renderGrid(config.types)}

      {!deal.ok && (
        <p className="placement-message" role="alert">
          {deal.message} — เพิ่มจำนวนการ์ดก่อนจึงจะเริ่มเกมได้
        </p>
      )}

      <button className="secondary-button" type="button" onClick={onReset}>
        คืนค่าเริ่มต้น ({defaultTotal} ใบ)
      </button>
    </section>
  )
}

export default CardCountsPanel