# การวิเคราะห์ Logic การตัดสินผลป๊อกเด้ง

## 1. ลำดับความในหญ่ของไพ่ (Hierarchy)

### Priority 1: ป๊อก (2 ใบแรกเท่านั้น)
- **ป๊อก 9**: แต้มรวม 9 จาก 2 ใบแรกแรกเท่านั้น
- **ป๊อก 8**: แต้มรวม 8 จาก 2 ใบแรกเท่านั้น
- **กฎพิเศษ**: ถ้าใครป๊อก เกมจบตรงนั้นทันที ไม่ต้องจั่วไพ่ใบที่ 3

### Priority 2: ไพ่พิเศษ (3 ใบ)
- **ตอง (Three of a Kind)**: เลขเดียวกันทั้ง 3 ใบ
- **สเตทฟลัช (Straight Flush)**: ไพ่เรียงกัน 3 ใบ + ดอกเดียวกัน
- **เรียง (Straight)**: ไพ่เรียงกัน 3 ใบ (2-3-4, 10-J-Q, A-2-3)
- **เซียน (Three Western Kings)**: J, Q, K ทั้ง 3 ใบ

### Priority 3: แต้มปกติ (0-9 แต้ม)
- วัดแต้มจากผลรวมไพ่ทั้งหมด แล้วน Mod 10
- 0 แต้ม = บอด (แย่งที่แย่ที่สุดท้าย)

## 2. กฎการวัดผล (Comparison Rules)

### กรณีป๊อก:
```typescript
if (dealerHand.type <= HandType.POK_8 && playerHand.type > HandType.POK_8) {
    return 'dealer'; // เจ้ามือป๊อกชนะทุกคนที่ไม่ป๊อก
}
```

### กรณีแต้มเท่ากัน:
1. วัดประเภทไพ่ก่อน (`HandType`)
2. ถ้าเท่ากัน วัดแต้ม (`score`)
3. ถ้าแต้มเท่ากัน วัดเด้ง (`dengMultiplier`)

### การนับเด้ง:
- **2 ใบ**: ดอกเหมือนกัน หรือ เลขเหมือนกัน = **2 เด้ง**
- **3 ใบ**: ดอกเหมือนันกัน = **3 เด้ง** (ยกเว้นตอง/เรียง/เซียน)

## 3. โครงสร้างฟังก์ชันที่ต้องการ

### 3.1. `evaluateHand(cards: Card[]): HandResult`
```typescript
export interface HandResult {
    type: HandType;
    score: number;
    deng: number;
    name: string;
}

export function evaluateHand(cards: Card[]): HandResult {
    // 1. ตรวจสอบป๊อก (เฉพาะ 2 ใบแรก)
    if (cards.length === 2) {
        const pok = checkPok(cards);
        if (pok === 'pok9') {
            return { type: HandType.POK_9, score: 9, deng: getDengMultiplier(cards), name: 'ป๊อก 9' };
        }
        if (pok === 'pok8') {
            return { type: HandType.POK_8, score: 8, deng: getDengMultiplier(cards), name: 'ป๊อก 8' };
        }
    }

    // 2. ตรวจสอบไพ่พิเศษ (เฉพาะ 3 ใบ)
    if (cards.length === 3) {
        if (isTong(cards)) {
            return { type: HandType.TONG, score: calculateScore(cards), deng: 5, name: 'ตอง' };
        }
        if (isStraightFlush(cards)) {
            return { type: HandType.STRAIGHT_FLUSH, score: calculateScore(cards), deng: 5, name: 'สเตทฟลัช' };
        }
        if (isStraight(cards)) {
            return { type: HandType.STRAIGHT, score: calculateScore(cards), deng: 3, name: 'เรียง' };
        }
        if (isSian(cards)) {
            return { type: HandType.SIAN, score: calculateScore(cards), deng: 3, name: 'เซียน' };
        }
    }

    // 3. แต้มปกติปกติ
    const score = calculateScore(cards);
    const deng = getDengMultiplier(cards);
    return { type: HandType.NORMAL, score, deng, name: score === 0 ? 'บอด' : `${score} แต้ม` };
}
```

### 3.2. `compareHands(dealerHand: HandResult, playerHand: HandResult): 'player' | 'dealer' | 'draw'`
```typescript
export function compareHands(dealerHand: HandResult, playerHand: HandResult): 'player' | 'dealer' | 'draw' {
    // ป๊อกมีความสูงสุด
    if (dealerHand.type <= HandType.POK_8 && playerHand.type > HandType.POK_8) {
        return 'dealer';
    }

    // เปรียบประเภทไพ่ก่อน
    if (dealerHand.type !== playerHand.type) {
        return dealerHand.type < playerHand.type ? 'dealer' : 'player';
    }

    // ปรียบแต้ม
    if (dealerHand.score !== playerHand.score) {
        return dealerHand.score > playerHand.score ? 'dealer' : 'player';
    }

    // ปรียบเด้ง
    if (dealerHand.deng !== playerHand.deng) {
        return dealerHand.deng > playerHand.deng ? 'dealer' : 'player';
    }

    return 'draw';
}
```

## 4. ฟังก์ชันตรวจสอบไพ่พิเศษ

### 4.1. `checkPok(cards: Card[]): 'pok9' | 'pok8' | null`
```typescript
export function checkPok(cards: Card[]): 'pok9' | 'pok8' | null {
    if (cards.length !== 2) return null;
    const score = calculateScore(cards);
    if (score === 9) return 'pok9';
    if (score === 8) return '8';
    return null;
}
```

### 4.2. `isTong(cards: Card[]): boolean`
```typescript
export function isTong(cards: Card[]): boolean {
    if (cards.length !== 3) return false;
    return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
}
```

### 4.3. `isStraight(cards: Card[]): boolean`
```typescript
export function isStraight(cards: Card[]): boolean {
    if (cards.length !== 3) return false;
    const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const indices = cards.map(c => rankOrder.indexOf(c.rank)).sort((a, b) => a - b);

    // Normal sequence (2-3-4, ..., 10-J-Q, J-Q-K)
    if (indices[2] - indices[1] === 1 && indices[1] - indices[0] === 1) return true;
    
    // Special case: Q-K-A (11, 12, 0)
    if (indices[0] === 0 && indices[1] === 11 && indices[2] === 12) return true;
    
    return false;
}
```

### 4.4. `isSian(cards: Card[]): boolean`
```typescript
export function isSian(cards: Card[]): boolean {
    if (cards.length !== 3) return false;
    const faceRanks: Rank[] = ['J', 'Q', 'K'];
    return cards.every(c => faceRanks.includes(c.rank));
}
```

### 4.5. `getDengMultiplier(cards: Card[]): number`
```typescript
export function getDengMultiplier(cards: Card[]): number {
    // ไพ่พิเศษมีค่า deng คงทอน
    if (cards.length === 3) {
        if (isTong(cards)) return 5;
        if (isStraightFlush(cards)) return 5;
        if (isStraight(cards)) return 3;
        if (isSian(cards)) return 3;
    }

    // 2 ใบ: คู่ หรือ ดอกเดียวกัน = 2 เด้ง
    if (cards.length === 2) {
        if (isPair(cards)) return 2;
        if (isSameSuit(cards)) return 2;
    }

    return 1;
}
```

## 5. ตัวออย่างงานใหม่ (Implementation Examples)

### 5.1. การตรวจสอบป๊อก
```typescript
// ใน showdown() หรือ dealNextCard()
const playerCards = players[playerIndex].cards;
const pok = checkPok(playerCards);

if (pok) {
    // ป๊อก! จบเกมทันที
    // ไม่ต้องจั่ววไพ่ใบที่ 3
    // ตั้งค่า hasPok = true และ dengMultiplier
}
```

### 5.2. การตรวจสอบไพ่พิเศษ
```typescript
// หลังจากจั่วไพ่ใบที่ 3
if (player.cards.length === 3) {
    const hand = evaluateHand(player.cards);
    
    switch (hand.type) {
        case HandType.TONG:
            // ตอง! 5 เด้ง
            break;
        case HandType.STRAIGHT_FLUSH:
            // สเตทฟลัช! 5 เด้ง
            break;
        case HandType.STRAIGHT:
            // เรียง! 3 เด้ง
            break;
        case HandType.SIAN:
            // เซียน! 3 เด้ง
            break;
    }
}
```

### 5.3 การเปรียบผลล
```typescript
const dealerHand = evaluateHand(dealer.cards);
const playerHand = evaluateHand(player.cards);
const result = compareHands(dealerHand, playerHand);

switch (result) {
    case 'player':
        // ผู้เล่นชนะ!
        // จ่ายเงินเดิมพัน + winnings
        break;
    case 'dealer':
        // เจ้ามือชนะ!
        // หักเงินเดิมพัน
        break;
    case 'draw':
        // เสมอ!
        // คืนเงินเดิมพัน
        break;
}
```

## 6. Edge Cases และการจัดการ

### 6.1. ค่าของ J, Q, K
```typescript
// J, Q, K มีค่า 0 ในระบบวน Pok Deng
// แต้มปกติ: 0 + 0 + 0 = 0 (บอด)
// แต้มปกติ: 0 + 0 + 0 = 0 (บอด)

// แต้มปกติ: J, Q, K = บอด (0 แต้ม)
// แต้มปกติ: 2, 3, 4 = 9 แต้ม
// แต้มปกติ: 10, J, Q = 0 แต้ม
```

### 6.2. การจัดการเรียง
```typescript
// ต้องตรวจสอบทั้งก่อนและปลายด์
if (cards[0].rank === cards[1].rank && 
    cards[1].rank === cards[2].rank) {
    // ตอง!
}

// ต้องตรวจสอบลำดับเรียง
if (isStraight(cards)) {
    // ตรวจสอบว่าเป็นลำดับเรียงจริง
    // 2-3-4, 10-J-Q, J-Q-K, A-2-3
}
```

### 6.3. การจัดการเซียน
```typescript
// ต้องตรวจสอบว่าเป็น J, Q, K ทั้ง 3 ใบ
if (cards.every(c => ['J', 'Q', 'K'].includes(c.rank))) {
    // เซียน!
}

// ไม่ใช่ J, Q, K ทั้ง 3 ใบ = ไม่ใช่เซียน
```

## 7. การเรียกค่าใหม่ (Refactoring Checklist)

### ✅ ตรวจสอบว่ามี `evaluateHand` และ `compareHands`
- [ ] มีฟังก์ชัน `evaluateHand(cards)` ที่คืนค่า HandResult ครบถ้วน
- [ ] มีฟังก์ชัน `compareHands(dealerHand, playerHand)` ที่ใช้ง logic ตามลำดับ
- [ ] ไม่มีการใช้ง logic เก่าๆ ใน UI components

### ✅ ตรวจสอบว่ามีการเช็ค Priority ถูกต้อง
- [ ] ป๊อกมีความสูงสุด (`HandType.POK_9`, `HandType.POK_8`)
- [ ] ไพ่พิเศษมีความรองล่าง (`HandType.TONG` ถึง `HandType.SIAN`)
- [ ] แต้มปกติมีความต่ำสุด (`HandType.NORMAL`)

### ✅ ตรวจสอบว่ามีการคำนวณ deng ถูกต้อง
- [ ] ตอง/สเตทฟลัช = 5 เด้ง
- [ ] เรียง/เซียน = 3 เด้ง
- [ ดอกเหมือนกัน = 3 เด้ง (3 ใบเหมือนกัน)
- [ คู่/ดอกเดียวกัน = 2 เด้ง (2 ใบ)

### ✅ ตรวจสอบว่ามีการจัดการแต้มเท่ากัน
- [ ] วัดแต้มก่อน (`dealerHand.score` vs `playerHand.score`)
- [ ] วัดเด้งก่อน (`dealerHand.deng` vs `playerHand.deng`)
- [ ] คืนค่าเสมอเมื่อแต้มและเด้งเท่ากัน

### ✅ ตรวจสอบ Edge Cases
- [ ] J, Q, K มีค่า 0 และถูกว่าบอด
- [ การจัดการเรียงที่เป็น A-2-3 และ Q-K-A
- [ การจัดการเซียนที่ต้องเป็น J, Q, K ทั้ง 3 ใบ
- [ การจัดการดอกเหมือนกันใน 2 และ 3 ใบ

### ✅ ตรวจสอบว่ามีการหยุดตรวจสอบ (Early Return)
- [ ] ถ้าเจ้ามือป๊อก ไม่ต้องจั่วไพ่ใบที่ 3
- [ ] ถ้าเจ้ามือป๊อก ผู้เล่นที่ไม่ป๊อกจะถูกถูกต้องทันที
- [ ] ถ้าเจ้ามือป๊อก AI ที่จั่วไพ่ใบที่ 3 จะถูกถูกต้องทันที

## 8. การใช้งงานใน React/TypeScript

### 8.1 ใน Component
```typescript
import { evaluateHand, compareHands, HandType } from '../utils/deck';

// ใน showdown()
const dealerHand = evaluateHand(dealer.cards);
const playerHands = players.map(p => evaluateHand(p.cards));

playerHands.forEach((playerHand, idx) => {
    const result = compareHands(dealerHand, playerHand);
    // อัปเดตัวแสดงผลลลงบบ UI
});
```

### 8.2 ใน Store (Zustand)
```typescript
// ใน showdown()
const dealerHand = evaluateHand(dealer.cards);
const results = players.map((p, i) => {
    const playerHand = evaluateHand(p.cards);
    const result = compareHands(dealerHand, playerHand);
    
    return {
        ...p,
        result,
        score: playerHand.score,
        hasPok: playerHand.type <= HandType.POK_8,
        dengMultiplier: playerHand.deng,
    };
});
```

## 9. การทดสอบ Logic

### 9.1. Test Cases
```typescript
// ทดสอบป๊อก 9
const pok9Cards = [{rank: 'K', value: 0}, {rank: '9', value: 9}];
expect(evaluateHand(pok9Cards).type).toBe(HandType.POK_9);
expect(evaluateHand(pok9Cards).score).toBe(9);

// ทดสอบตอง
const tongCards = [{rank: '7', value: 7}, {rank: '7', value: 7}, {rank: '7', value: 7}];
expect(evaluateHand(tongCards).type).toBe(HandType.TONG);
expect(evaluateHand(tongCards).deng).toBe(5);

// ทดสอบเรียง
const straightCards = [{rank: '2', value: 2}, {rank: '3', value: 3}, {rank: '4', value: 4}];
expect(evaluateHand(straightCards).type).toBe(HandType.STRAIGHT);
expect(evaluateHand(straightCards).deng).toBe(3);
```

### 9.2 ทดสอบการเปรียบ
```typescript
// ป๊อก 9 vs แต้ม 7
const pok9Hand = { type: HandType.POK_9, score: 9, deng: 1 };
const normal7Hand = { type: HandType.NORMAL, score: 7, deng: 1 };
expect(compareHands(pok9Hand, normal7Hand)).toBe('dealer');

// ตอง vs เรียง
const tongHand = { type: HandType.TONG, score: 1, deng: 5 };
const straightHand = { type: HandType.STRAIGHT, score: 7, deng: 3 };
expect(compareHands(tongHand, straightHand)).toBe('dealer');

// แต้มเท่ากัน แต้มเด้งต่าง่าน
const hand1 = { type: HandType.NORMAL, score: 7, deng: 2 };
const hand2 = { type: HandType.NORMAL, score: 7, deng: 1 };
expect(compareHands(hand1, hand2)).toBe('player');
```

---

**หมายเห็น**: ให้้ Logic นี้จะช่วยให้การ Refactor ใหม่ทั้งหมดตามกฎมาตรฐานสากลอย่างถูกต้องทุกประเภทและถูกต้องตามลำดับที่ถูกต้อง! 🎯
