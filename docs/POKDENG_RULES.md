# กฎการวัดผลและลำดับความใหญ่ (Priority) - ป๊อกเด้ง

## 1. ลำดับการตรวจสอบไพ่ (Priority Logic)

ในการเขียน Code คุณต้องเช็คตามลำดับนี้เสมอ เพราะหากเข้าเงื่อนไขข้อบนแล้ว ข้อล่างจะถูกข้ามทันที:

### Pok Check (แจก 2 ใบแรก):
- **ป๊อก 9**: แต้มรวมได้ 9 (ชนะทุกอย่างยกเว้นป๊อก 9 ด้วยกัน)
- **ป๊อก 8**: แต้มรวมได้ 8 (ชนะทุกอย่างยกเว้นป๊อก 9 และป๊อก 8)

### Special Hand Check (กรณีจั่วใบที่ 3):
- **ตอง (Three of a Kind)**: เลขเดียวกัน 3 ใบ
- **สเตทฟลัช (Straight Flush)**: เรียงกัน 3 ใบ + ดอกเดียวกัน
- **เรียง (Straight)**: เรียงกัน 3 ใบ (ดอกไม่ซ้ำ)
- **เซียน/สามเหลือง (Three Western Kings)**: กลุ่ม J, Q, K ทั้ง 3 ใบ

### Point Check (แต้มปกติ):
- วัดแต้ม `0-9` จากผลรวมใบที่อยู่ในมือทั้งหมด

---

## 2. รายละเอียดชุดไพ่และอัตราจ่าย (Hand Detail & Payout)

| ประเภทไพ่ | เงื่อนไขการนับ | อัตราจ่าย | หมายเหตุ (สำหรับ Dev) |
|------------|------------------|-----------|---------------------|
| **ป๊อก 9** | 2 ใบแรกบวกกันได้ 9 | 1 เท่า (2 เด้งจ่าย 2) | จบเกมทันที |
| **ป๊อก 8** | 2 ใบแรกบวกกันได้ 8 | 1 เท่า (2 เด้งจ่าย 2) | จบเกมทันที |
| **ตอง** | เลขเดียวกัน 3 ใบ | 5 เด้ง | ใหญ่ที่สุดหลังป๊อก |
| **สเตทฟลัช** | เรียง + ดอกเดียวกัน | 5 เด้ง | เช่น 5-6-7 ดอกจิกหมด |
| **เรียง** | เลขเรียงกัน 3 ใบ | 3 เด้ง | 10-J-Q หรือ A-2-3 ก็ได้ |
| **เซียน** | J, Q, K ทั้ง 3 ใบ | 3 เด้ง | J-Q-K / Q-Q-K |
| **สามเหลือง** | 3 ใบ ดอกเดียวกัน | 3 เด้ง | |
| **แต้มปกติ** | รวมแต้มแล้ว `Mod 10` | 1 เท่า | 0 แต้มเรียกว่า "บอด" |
| **สองเด้ง** | 2 ใบ ดอก/เลขเดียวกัน | 2 เด้ง | 9 แต้ม 2 เด้ง = ป๊อก 9 |

---

## 3. กฎการเปรียบเทียบ (Comparison Rules)

เมื่อต้องเปรียบเทียบระหว่าง "เจ้ามือ" และ "ผู้เล่น" ให้ AI ใช้ Logic ดังนี้:

### กรณีป๊อก:
- ถ้าเจ้ามือ **ป๊อก 9**: กินรอบวง (ยกเว้นคนป๊อก 9 เท่ากันจะเจ๊า)
- ถ้าเจ้ามือ **ป๊อก 8**: กินทุกคนที่แต้มน้อยกว่า (ยกเว้นคนป๊อก 9 จะชนะเจ้ามือ)
- ถ้าเจ้ามือป๊อก ผู้เล่นที่จั่วใบที่ 3 มาแล้วจะถูกยกเลิกผลทันที เพราะถือว่าเกมจบตั้งแต่ 2 ใบแรก

### กรณีวัดไพ่พิเศษ (เมื่อไม่มีใครป๊อก):
ให้ยึดตามลำดับความใหญ่: **ตอง > สเตทฟลัช > เรียง > เซียน > แต้มปกติ**

- **ตัวอย่าง 1**: ผู้เล่นได้ "เซียน" (3 เด้ง) vs เจ้ามือได้ "9 แต้ม" (3 ใบ) -> **ผู้เล่นชนะ** เพราะไพ่พิเศษใหญ่กว่าแต้ม
- **ตัวอย่าง 2**: ผู้เล่นได้ "เรียง" vs เจ้ามือได้ "ตอง" -> **เจ้ามือชนะ**

### กรณีแต้มเท่ากัน:
- ถ้าแต้มเท่ากัน (เช่น 7 แต้ม กับ 7 แต้ม) ให้ดู "เด้ง"
- ใครเด้งเยอะกว่า ชนะ
- ถ้าแต้มเท่า และเด้งเท่า = **เจ๊า (Tie)** คืนเงินเดิมพัน

---

## 4. Implementation Notes สำหรับ Developer

### การตรวจสอบลำดับความสำคัญ (Pseudo-code):
```typescript
function evaluateHand(cards: Card[]): HandResult {
    // 1. ตรวจป๊อก (2 ใบแรกเท่านั้น)
    if (cards.length === 2) {
        const sum = cards[0].value + cards[1].value;
        if (sum === 9) return { type: 'POK_9', score: 9, deng: calculateDeng(cards) };
        if (sum === 8) return { type: 'POK_8', score: 8, deng: calculateDeng(cards) };
    }
    
    // 2. ตรวจไพ่พิเศษ (3 ใบเท่านั้น)
    if (cards.length === 3) {
        if (isTong(cards)) return { type: 'TONG', score: calculateScore(cards), deng: 5 };
        if (isStraightFlush(cards)) return { type: 'STRAIGHT_FLUSH', score: calculateScore(cards), deng: 5 };
        if (isStraight(cards)) return { type: 'STRAIGHT', score: calculateScore(cards), deng: 3 };
        if (isSian(cards)) return { type: 'SIAN', score: calculateScore(cards), deng: 3 };
        if (isThreeYellow(cards)) return { type: 'THREE_YELLOW', score: calculateScore(cards), deng: 3 };
    }
    
    // 3. คำนวณแต้มปกติ
    return { type: 'NORMAL', score: calculateScore(cards), deng: calculateDeng(cards) };
}
```

### การเปรียบเทียบมือ (Pseudo-code):
```typescript
function compareHands(dealer: HandResult, player: HandResult): 'WIN' | 'LOSE' | 'TIE' {
    // ป๊อกมีความสำคัญสูงสุด
    if (dealer.type.startsWith('POK') && !player.type.startsWith('POK')) return 'WIN';
    if (!dealer.type.startsWith('POK') && player.type.startsWith('POK')) return 'LOSE';
    
    // เปรียบประเภทไพ่พิเศษ
    const priority = ['POK_9', 'POK_8', 'TONG', 'STRAIGHT_FLUSH', 'STRAIGHT', 'SIAN', 'THREE_YELLOW', 'NORMAL'];
    const dealerPriority = priority.indexOf(dealer.type);
    const playerPriority = priority.indexOf(player.type);
    
    if (dealerPriority !== playerPriority) {
        return dealerPriority < playerPriority ? 'WIN' : 'LOSE';
    }
    
    // เปรียบแต้ม
    if (dealer.score !== player.score) {
        return dealer.score > player.score ? 'WIN' : 'LOSE';
    }
    
    // เปรียบเด้ง
    if (dealer.deng !== player.deng) {
        return dealer.deng > player.deng ? 'WIN' : 'LOSE';
    }
    
    return 'TIE';
}
```

---

## 5. Edge Cases ที่ต้องระวัง

1. **ป๊อก vs จั่ว**: ถ้าเจ้ามือป๊อก ผู้เล่นที่จั่วใบที่ 3 จะถือว่าแพ้ทันที (ไม่ต้องคำนวณไพ่พิเศษ)
2. **A-2-3**: นับเป็นเรียง (เหมือน 10-J-Q)
3. **บอด**: แต้ม 0 ถือว่าแย่ที่สุดในกลุ่มแต้มปกติ
4. **เด้ง**: คำนวณจากดอกเดียวกันหรือเลขเดียวกัน 2 ใบใดๆ ในมือ
