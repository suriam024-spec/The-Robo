// M4.1 — ระบบกอง/มือ/กองทิ้งแบบทั่วไป (ฟังก์ชันล้วน ไม่ผูกกับหน้าจอ และไม่รู้จักชนิดการ์ด)
// ใช้กับ Movement Cards ใน M4.1 และ Virus Cards ใน M4.2
//
// สถานะ = { drawPile, discardPile, hands }
//   drawPile    กองจั่ว (index 0 = ใบบนสุด จั่วจากหัวอาร์เรย์)
//   discardPile กองทิ้ง (แยกจากกองจั่ว)
//   hands       มือของผู้เล่นแต่ละคน เรียงตามลำดับผู้เล่น
// ทุกฟังก์ชันไม่แก้สถานะเดิม คืนสถานะใหม่เสมอ
// กติกา (OWNER ตัดสิน Q2): กองจั่วกับกองทิ้งแยกกัน ถ้ากองจั่วหมดแต่ยังต้องจั่ว
//   ให้เอากองทิ้งทั้งหมดมาสับแล้วเปลี่ยนเป็นกองจั่ว (กองทิ้งว่าง) แล้วจั่วต่อ

// สับไพ่แบบ Fisher–Yates คืนอาร์เรย์ใหม่ (ไม่แก้ของเดิม) randomFn คืนค่า [0, 1) ฉีดเข้าได้เพื่อทดสอบ
export function shuffle(cards, randomFn = Math.random) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(randomFn() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// สร้างสถานะเริ่มต้น: สับกอง แจกมือ handSize ใบให้ผู้เล่นแต่ละคนตามลำดับ (คนที่ 0 ได้ชุดแรก) ที่เหลือเป็นกองจั่ว
// ถ้าการ์ดไม่พอแจกจะ throw error (ผู้เรียกควรตรวจก่อนด้วย canDealMovement)
export function createCardState(
  deck,
  playerCount,
  handSize,
  randomFn = Math.random,
) {
  const needed = playerCount * handSize;
  if (deck.length < needed) {
    throw new Error(`Not enough cards: need ${needed}, have ${deck.length}`);
  }

  const shuffled = shuffle(deck, randomFn);
  return {
    drawPile: shuffled.slice(needed),
    discardPile: [],
    hands: Array.from({ length: playerCount }, (_, playerIndex) =>
      shuffled.slice(playerIndex * handSize, (playerIndex + 1) * handSize),
    ),
  };
}

function assertPlayer(state, playerIndex) {
  if (
    !Number.isInteger(playerIndex) ||
    playerIndex < 0 ||
    playerIndex >= state.hands.length
  ) {
    throw new Error(`Invalid player index: ${playerIndex}`);
  }
}

// จั่ว count ใบเข้ามือผู้เล่น (ใบใหม่ต่อท้ายมือ) กองจั่วหมดกลางทางจะสับกองทิ้งเป็นกองจั่วแล้วจั่วต่อ
// ถ้าทั้งกองจั่วและกองทิ้งหมด จะจั่วได้เท่าที่มี
// คืนค่า { state, drawn, reshuffled }  (drawn = การ์ดที่จั่วได้ตามลำดับ, reshuffled = มีการสับกองทิ้งหรือไม่)
export function drawToHand(state, playerIndex, count, randomFn = Math.random) {
  assertPlayer(state, playerIndex);

  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  const drawn = [];
  let reshuffled = false;

  while (drawn.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = shuffle(discardPile, randomFn);
      discardPile = [];
      reshuffled = true;
    }
    drawn.push(drawPile.shift());
  }

  return {
    state: {
      drawPile,
      discardPile,
      hands: state.hands.map((hand, index) =>
        index === playerIndex ? [...hand, ...drawn] : [...hand],
      ),
    },
    drawn,
    reshuffled,
  };
}

// เล่นการ์ด: เอาการ์ด cardUid ออกจากมือผู้เล่น ไปไว้กองทิ้ง
// ถ้าไม่มีการ์ดนี้ในมือผู้เล่นจะ throw error
// คืนค่า { state, card }
export function playCard(state, playerIndex, cardUid) {
  assertPlayer(state, playerIndex);

  const hand = state.hands[playerIndex];
  const card = hand.find((item) => item.uid === cardUid);
  if (!card) {
    throw new Error(`Card ${cardUid} is not in player ${playerIndex}'s hand`);
  }

  return {
    state: {
      drawPile: [...state.drawPile],
      discardPile: [...state.discardPile, card],
      hands: state.hands.map((current, index) =>
        index === playerIndex
          ? current.filter((item) => item.uid !== cardUid)
          : [...current],
      ),
    },
    card,
  };
}

// เติมมือเมื่อมือหมด (GDD หัวข้อ 26): ถ้ามือยังมีการ์ดอยู่ไม่ทำอะไร ถ้าหมดจั่ว handSize ใบ
// คืนค่า { state, drawn, reshuffled, refilled }
export function refillHand(
  state,
  playerIndex,
  handSize,
  randomFn = Math.random,
) {
  assertPlayer(state, playerIndex);

  if (state.hands[playerIndex].length > 0) {
    return { state, drawn: [], reshuffled: false, refilled: false };
  }

  const result = drawToHand(state, playerIndex, handSize, randomFn);
  return { ...result, refilled: true };
}

// จำนวนการ์ดทั้งหมดในสถานะ (กองจั่ว + กองทิ้ง + ทุกมือ) ควรคงที่ตลอดเกม ใช้ตรวจว่าไม่มีการ์ดหาย/ซ้ำ
export function countAllCards(state) {
  return (
    state.drawPile.length +
    state.discardPile.length +
    state.hands.reduce((sum, hand) => sum + hand.length, 0)
  );
}
