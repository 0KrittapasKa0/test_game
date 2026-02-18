# การจัดการเกมป๊อกเด้งแบบหลายคน (Multiplayer Implementation)

## 1. ลำดับการเล่น (Turn-based Logic)

### 1.1 ขั้นตอนการเล่นรอบเดียว

```typescript
// ขั้นที่ 1: แจกไพ่รอบแรก
function distributeCards(gameState: GameState): GameState {
  const deck = shuffleDeck(createDeck());
  const newPlayers = [...gameState.players];
  
  // แจกให้ทุกคน 2 ใบแรก
  for (let i = 0; i < newPlayers.length; i++) {
    newPlayers[i].cards = [deck.pop()!, deck.pop()!];
  }
  
  // เจ้ามือก็ได้ 2 ใบแรก
  gameState.dealer.cards = [deck.pop()!, deck.pop()!];
  
  return {
    ...gameState,
    deck,
    players: newPlayers,
    phase: 'POK_CHECK'
  };
}
```

### 1.2 การเช็คป๊อกทันที

```typescript
// ขั้นที่ 2: เช็คว่าเจ้ามือป๊อกหรือไม่
function checkDealerPok(gameState: GameState): GameState {
  const dealerHand = evaluateHand(gameState.dealer.cards);
  const isDealerPok = dealerHand.type <= HandType.POK_8;
  
  if (isDealerPok) {
    // เจ้ามือป๊อก! จบเกมทันที
    return settleGame(gameState, 'DEALER_POK');
  }
  
  // เจ้ามือไม่ป๊อก ต่อไปขั้นถัดไป
  return {
    ...gameState,
    phase: 'PLAYER_TURN',
    currentPlayerIndex: 0 // เริ่มจากผู้เล่นคนแรก
  };
}
```

### 1.3 การจัดการผู้เล่นแต่ละคน

```typescript
// ขั้นที่ 3: วนลูปให้ผู้เล่นตัดสินใจ
function playerAction(gameState: GameState, playerId: string, action: 'draw' | 'stay'): GameState {
  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  const player = gameState.players[playerIndex];
  
  if (action === 'draw') {
    // จั่วไพ่ใบที่ 3
    const newCard = gameState.deck.pop()!;
    player.cards.push(newCard);
    
    // อัปเดตสถานะ
    const hand = evaluateHand(player.cards);
    player.score = hand.score;
    player.hasPok = hand.type <= HandType.POK_8;
    player.multiplier = hand.deng;
  }
  
  // อัปเดตว่าเล่นเสร็จแล้ว
  player.hasActed = true;
  
  // ตรวจสอบว่าถึงคนสุดท้ายหรือยัง
  const nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex);
  
  if (nextPlayerIndex === -1) {
    // ทุกคนเล่นเสร็จแล้ว ถึงตาเจ้ามือ
    return dealerAction(gameState);
  }
  
  return {
    ...gameState,
    currentPlayerIndex: nextPlayerIndex,
    deck: gameState.deck.slice(1)
  };
}
```

### 1.4 การจัดการเจ้ามือ

```typescript
// ขั้นที่ 4: เจ้ามือตัดสินใจ
function dealerAction(gameState: GameState): GameState {
  const dealer = gameState.dealer;
  const currentScore = calculateScore(dealer.cards);
  
  // กฎ: ถ้าแต้มต่ำกว่า 4 ต้องจั่ว (Auto-draw)
  if (currentScore <= 3) {
    const newCard = gameState.deck.pop()!;
    dealer.cards.push(newCard);
    
    const hand = evaluateHand(dealer.cards);
    dealer.score = hand.score;
    dealer.hasPok = hand.type <= HandType.POK_8;
    dealer.multiplier = hand.deng;
  }
  
  dealer.hasActed = true;
  
  // จบรอบและคำนวณผลลัพธ์
  return settleGame(gameState, 'NORMAL');
}
```

## 2. โครงสร้างข้อมูลที่แนะนำ (Data Structure)

### 2.1 GameState Interface

```typescript
interface GameState {
  phase: 'BETTING' | 'POK_CHECK' | 'PLAYER_TURN' | 'DEALER_TURN' | 'SETTLEMENT';
  deck: Card[];
  pot: number;
  
  dealer: {
    id: 'dealer';
    cards: Card[];
    score: number;
    hasPok: boolean;
    multiplier: number;
    chips: number;
  };
  
  players: Player[];
  
  currentPlayerIndex: number;
  roundNumber: number;
}

interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  bet: number;
  chips: number;
  cards: Card[];
  score: number;
  hasPok: boolean;
  multiplier: number;
  hasActed: boolean;
  result?: 'win' | 'lose' | 'draw';
}
```

### 2.2 การเริ่มเกม

```typescript
function initializeGame(playerCount: number): GameState {
  const players = createPlayers(playerCount);
  
  return {
    phase: 'BETTING',
    deck: shuffleDeck(createDeck()),
    pot: 0,
    dealer: {
      id: 'dealer',
      cards: [],
      score: 0,
      hasPok: false,
      multiplier: 1,
      chips: 10000 // เงินเจ้ามือ
    },
    players,
    currentPlayerIndex: 0,
    roundNumber: 1
  };
}
```

## 3. การคำนวณเงินและการจ่าย (Payout Management)

### 3.1 การคำนวณยอดสุทธิของเจ้ามือ

```typescript
function settleGame(gameState: GameState, reason: 'DEALER_POK' | 'NORMAL'): GameState {
  const dealerHand = evaluateHand(gameState.dealer.cards);
  let dealerNetProfit = 0;
  
  const results = gameState.players.map(player => {
    const playerHand = evaluateHand(player.cards);
    const outcome = compareHands(dealerHand, playerHand);
    
    let chipChange = 0;
    let result: 'win' | 'lose' | 'draw';
    
    if (outcome === 'player') {
      // ผู้เล่นชนะ
      const winnings = player.bet * Math.max(playerHand.multiplier, dealerHand.multiplier);
      chipChange = player.bet + winnings; // คืนเดิมพัน + รับเงินรางวัล
      result = 'win';
      dealerNetProfit -= winnings;
    } else if (outcome === 'dealer') {
      // ผู้เล่นแพ้
      const losses = player.bet * Math.max(playerHand.multiplier, dealerHand.multiplier);
      chipChange = -losses;
      result = 'lose';
      dealerNetProfit += losses;
    } else {
      // เสมอ
      chipChange = player.bet; // คืนเดิมพัน
      result = 'draw';
    }
    
    return {
      ...player,
      chips: player.chips + chipChange,
      result,
      score: playerHand.score,
      hasPok: playerHand.type <= HandType.POK_8,
      multiplier: playerHand.multiplier
    };
  });
  
  // อัปเดตเงินเจ้ามือ
  const updatedDealer = {
    ...gameState.dealer,
    chips: gameState.dealer.chips + dealerNetProfit
  };
  
  return {
    ...gameState,
    players: results,
    dealer: updatedDealer,
    phase: 'SETTLEMENT'
  };
}
```

### 3.2 การจัดการเงินจำกัดเจ้ามือ

```typescript
function processPayoutsLimited(gameState: GameState): GameState {
  let dealerChips = gameState.dealer.chips;
  const results = [...gameState.players];
  
  // จ่ายตามลำดับที่แจกไพ่ (ขาที่ 1 ไปขาที่ N)
  for (let i = 0; i < results.length; i++) {
    const player = results[i];
    if (player.result !== 'win') continue; // จ่ายเฉพาะคนที่ชนะ
    
    const winnings = player.bet * player.multiplier;
    
    if (dealerChips >= winnings) {
      // จ่ายได้เต็มจำนวน
      player.chips += player.bet + winnings;
      dealerChips -= winnings;
    } else {
      // เงินเจ้ามือไม่พอ
      player.chips += player.bet + dealerChips; // จ่ายได้เท่าที่มี
      dealerChips = 0;
      break; // หยุดจ่าย
    }
  }
  
  return {
    ...gameState,
    players: results,
    dealer: { ...gameState.dealer, chips: dealerChips }
  };
}
```

## 4. ฟังก์ชันหลักที่ต้องการ

### 4.1 ฟังก์ชันหลัก

```typescript
// แจกไพ่ให้ผู้เล่นทุกคน
function distributeCards(gameState: GameState): GameState;

// ตรวจสอบว่าเจ้ามือป๊อกหรือไม่
function checkDealerPok(gameState: GameState): GameState;

// จัดการการจั่วไพ่ของผู้เล่น
function playerAction(gameState: GameState, playerId: string, action: 'draw' | 'stay'): GameState;

// จัดการการจั่วไพ่ของเจ้ามือ
function dealerAction(gameState: GameState): GameState;

// คำนวณผลลัพธ์และจ่ายเงิน
function settleGame(gameState: GameState, reason: string): GameState;

// หาผู้เล่นคนถัดไป
function getNextPlayerIndex(gameState: GameState, currentIndex: number): number;
```

### 4.2 ฟังก์ชัน AI Decision

```typescript
function aiDecision(player: Player, dealerCards: Card[]): 'draw' | 'stay' {
  const currentScore = calculateScore(player.cards);
  
  // กฎ AI: ถ้าแต้ม ≤ 3 จั่ว, ถ้า 4-5 มีโอกาส 65%, ถ้า 6 มีโอกาส 30%
  if (currentScore <= 3) return 'draw';
  if (currentScore >= 6) return 'stay';
  
  return Math.random() < 0.65 ? 'draw' : 'stay';
}
```

## 5. ข้อระวังในการเขียน Code (Logic Pitfalls)

### 5.1 การจั่วไพ่ของเจ้ามือ

```typescript
function dealerAction(gameState: GameState): GameState {
  // ❌ ผิด: จั่วไพ่ทันทีโดยไม่ดูแต้ม
  // const newCard = gameState.deck.pop()!;
  // gameState.dealer.cards.push(newCard);
  
  // ✅ ถูกต้อง: ดูแต้มก่อนจั่ว
  const currentScore = calculateScore(gameState.dealer.cards);
  
  if (currentScore <= 3) {
    // แต้มต่ำกว่า 4 ต้องจั่ว
    const newCard = gameState.deck.pop()!;
    gameState.dealer.cards.push(newCard);
  }
  
  // อัปเดตสถานะหลังจั่ว
  const hand = evaluateHand(gameState.dealer.cards);
  gameState.dealer.score = hand.score;
  gameState.dealer.hasPok = hand.type <= HandType.POK_8;
  gameState.dealer.multiplier = hand.deng;
  
  return gameState;
}
```

### 5.2 การวน Loop จ่ายเงิน

```typescript
function settleGame(gameState: GameState): GameState {
  // ❌ ผิด: ไม่เช็คสถานะก่อนคำนวณ
  // const outcome = compareHands(dealerHand, playerHand);
  // const winnings = player.bet * player.multiplier;
  
  // ✅ ถูกต้อง: เช็คสถานะก่อนคำนวณเด้ง
  const playerHand = evaluateHand(player.cards);
  const dealerHand = evaluateHand(dealer.cards);
  const outcome = compareHands(dealerHand, playerHand);
  
  let chipChange = 0;
  if (outcome === 'player') {
    // ใช้ตัวคูณที่สูงกว่า
    const multiplier = Math.max(playerHand.multiplier, dealerHand.multiplier);
    const winnings = player.bet * multiplier;
    chipChange = player.bet + winnings;
  }
  
  return {
    ...gameState,
    players: updatedPlayers,
    dealer: updatedDealer
  };
}
```

### 5.3 การจัดการ Special Hands

```typescript
function evaluateHand(cards: Card[]): HandResult {
  // ❌ ผิด: ลืมเช็คว่าตอง/สเตทฟลัชมีค่า deng คงทอน
  // if (isTong(cards)) return { type: HandType.TONG, score: calculateScore(cards), deng: 1 };
  
  // ✅ ถูกต้อง: ให้ค่า deng คงทอนตามกฎ
  if (isTong(cards)) {
    return { 
      type: HandType.TONG, 
      score: calculateScore(cards), 
      deng: 5,  // ตอง = 5 เด้ง
      name: 'ตอง' 
    };
  }
  
  if (isStraightFlush(cards)) {
    return { 
      type: HandType.STRAIGHT_FLUSH, 
      score: calculateScore(cards), 
      deng: 5,  // สเตทฟลัช = 5 เด้ง
      name: 'สเตทฟลัช' 
    };
  }
  
  // ... ตรวจสอบประเภทอื่นๆ
}
```

## 6. ตัวอย่างการใช้งาน

### 6.1 การเริ่มเกมและเล่นรอบเดียว

```typescript
// เริ่มเกม
let gameState = initializeGame(4); // 4 ผู้เล่น

// แจกไพ่รอบแรก
gameState = distributeCards(gameState);

// เช็คป๊อกเจ้ามือ
gameState = checkDealerPok(gameState);

if (gameState.phase === 'PLAYER_TURN') {
  // วนลูปให้ผู้เล่นเล่น
  for (let i = 0; i < gameState.players.length; i++) {
    const player = gameState.players[i];
    
    if (player.isHuman) {
      // รอง input จากผู้เล่นจริง
      // gameState = playerAction(gameState, player.id, 'draw' | 'stay');
    } else {
      // AI ตัดสินใจอัตโนมัติ
      const action = aiDecision(player, gameState.dealer.cards);
      gameState = playerAction(gameState, player.id, action);
    }
  }
  
  // เจ้ามือเล่น
  gameState = dealerAction(gameState);
}

// คำนวณผลลัพธ์
gameState = settleGame(gameState, 'NORMAL');

// แสดงผลลัพธ์
displayResults(gameState);
```

### 6.2 การจัดการกรณีเจ้ามือป๊อก

```typescript
function handleDealerPok(gameState: GameState): GameState {
  // เจ้ามือป๊อก! จบเกมทันที
  const dealerHand = evaluateHand(gameState.dealer.cards);
  
  const results = gameState.players.map(player => {
    const playerHand = evaluateHand(player.cards);
    
    // ถ้าผู้เล่นไม่ป๊อก = แพ้ทันที
    if (playerHand.type > HandType.POK_8) {
      const losses = player.bet * 2; // สมมติว่าเจ้ามือป๊อก 2 เด้ง
      return {
        ...player,
        chips: player.chips - losses,
        result: 'lose'
      };
    }
    
    // ถ้าผู้เล่นป๊อกด้วย = เสมอ
    return {
      ...player,
      chips: player.chips + player.bet,
      result: 'draw'
    };
  });
  
  return {
    ...gameState,
    players: results,
    phase: 'SETTLEMENT'
  };
}
```

## 7. การทดสอบ (Testing)

### 7.1 Test Cases

```typescript
// Test 1: เจ้ามือป๊อก 9
test('Dealer Pok 9 wins against normal hand', () => {
  const gameState = createTestGame();
  gameState.dealer.cards = [{rank: 'K', value: 0}, {rank: '9', value: 9}];
  gameState.players[0].cards = [{rank: '7', value: 7}, {rank: '2', value: 2}];
  
  const result = checkDealerPok(gameState);
  expect(result.phase).toBe('SETTLEMENT');
  expect(result.players[0].result).toBe('lose');
});

// Test 2: ผู้เล่นตองชนะเจ้ามือแต้ม 9
test('Player Tong beats dealer 9 points', () => {
  const gameState = createTestGame();
  gameState.dealer.cards = [{rank: '9', value: 9}, {rank: '10', value: 0}, {rank: 'K', value: 0}];
  gameState.players[0].cards = [{rank: '7', value: 7}, {rank: '7', value: 7}, {rank: '7', value: 7}];
  
  const result = settleGame(gameState, 'NORMAL');
  expect(result.players[0].result).toBe('win');
  expect(result.players[0].multiplier).toBe(5);
});
```

## 8. การปรับปรุง (Optimization)

### 8.1 การจัดการ Concurrent Actions

```typescript
// ใช้ Promise.all สำหรับรองผู้เล่นหลายคนพร้อมกัน
async function handleAllPlayerActions(gameState: GameState): Promise<GameState> {
  const actions = gameState.players
    .filter(p => !p.isHuman)
    .map(player => 
      new Promise<{playerId: string, action: 'draw' | 'stay'}>(resolve => {
        const action = aiDecision(player, gameState.dealer.cards);
        resolve({ playerId: player.id, action });
      })
    );
  
  const results = await Promise.all(actions);
  
  let newState = gameState;
  results.forEach(({ playerId, action }) => {
    newState = playerAction(newState, playerId, action);
  });
  
  return newState;
}
```

### 8.2 การจัดการ State Management

```typescript
// ใช้ Immer สำหรับ immutable updates
import { produce } from 'immer';

const gameState = produce(currentState, draft => {
  draft.players[0].chips += 100;
  draft.dealer.chips -= 100;
});
```

---

**หมายเห็ุ**: โครงสร้างนี้จะช่วยให้ AI เขียน Logic การจัดการเกมป๊อกเด้งแบบหลายคนได้อย่างถูกต้องตามมาตรฐานสากล! 🎯
