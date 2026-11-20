# Prompt สำหรับวาดภาพห้องด้วย AI (เปลี่ยนภาพห้องเป็นแบบสตอรี่บอร์ด)

ตอนนี้ภาพห้องเป็น SVG ที่วาดด้วยโค้ด ถ้าอยากได้ภาพระบายสีสวยๆ แบบสตอรี่บอร์ด ให้สร้างภาพด้วยเครื่องมือ AI ตามด้านล่าง แล้ว **ส่งไฟล์มาให้ Claude** จะเจาะหน้าต่างให้โปร่งใส ย่อไฟล์ และจูนพิกัดพื้น/โซฟา/เตียงให้ตัวละครเดินตรงเอง

## กติกาทุกภาพ (สำคัญ)

- อัตราส่วน **8:5** (เช่น 1600×1000 หรือ 2400×1500)
- **ห้ามมีคน ห้ามมีแมว ห้ามมีตัวหนังสือ ห้ามมีปุ่ม** ตัวละครกับแมวในแอปเดินได้เอง ถ้าอยู่ในภาพจะซ้อนกัน
- มุมมองตรงหน้า ระดับสายตา (front view, eye level) เหมือนฉากเกม 2D
- **พื้นช่วงล่าง 30% ของภาพต้องโล่ง** (ตัวละครเดินตรงนั้น) มีพรมได้ แต่ไม่มีเฟอร์นิเจอร์ขวาง
- **หน้าต่าง/ช่องวิวอยู่มุมซ้ายบน** และให้กระจกเป็นสีเขียวล้วน `#00FF00` (เพื่อให้วิวนอกหน้าต่างเปลี่ยนตามฤดูได้)

## สไตล์ (ใส่ต่อท้ายทุก prompt)

```
cozy hand-painted storybook illustration, 2D game background, warm soft lighting,
gentle shadows, pastel warm palette (cream, honey wood, soft pink, sage green),
highly detailed but clean, no people, no animals, no text, no UI, front view, eye level,
empty floor area in the bottom third, 8:5 aspect ratio
```

## ห้องนั่งเล่น (`art/rooms/living`)

```
Interior of a small cozy wooden living room. Large window on the upper left with
curtains, the window glass is solid flat bright green #00FF00. A pink fabric sofa on
the right side against the wall with cushions, a floor lamp at the far right, wall
shelf with books and small plants, wall clock, framed pictures, a bookshelf in the
left corner, hanging plants, potted plant next to the sofa, round woven rug on the
wooden plank floor in the center, sunlight.
```
ตำแหน่ง: โซฟาประมาณ 53–92% ของความกว้าง, ขอบล่างโซฟาประมาณ 70% ของความสูง

## ห้องนอน (`art/rooms/bedroom`)

```
Interior of a cozy wooden bedroom. Window on the upper left with soft blue curtains,
the window glass is solid flat bright green #00FF00. A double bed on the right side
with a purple headboard, white pillows and a quilt, a nightstand with a small lamp
next to the bed, fairy string lights on the wall, framed night-sky picture, potted
plant, round blue rug on the wooden floor, calm warm evening light.
```
ตำแหน่ง: เตียงประมาณ 55–94% ของความกว้าง, ขอบล่างเตียงประมาณ 70% ของความสูง

## ห้องครัว (`art/rooms/kitchen`)

```
Interior of a cozy cottage kitchen. Window on the upper left with a red scalloped
valance, the window glass is solid flat bright green #00FF00, small herb pots on the
sill. A long kitchen counter on the right with a sink and a stove, wall tiles, open
shelves with jars and plates, hanging pans and ladles, a pendant lamp, a small round
dining table on the left, checkered tile floor, a cat food bowl and a cat bed on the
floor near the right edge.
```

## สวน (`art/rooms/garden`)

```
A cozy backyard garden. A flower arch on the upper left, the opening inside the arch
is solid flat bright green #00FF00. Hedges and round bushes behind a white wooden
fence, string lights over the fence, a wooden bench, a lantern post on the right,
a flower bed on the left, a small round pond with lily pads on the right, stepping
stones on the lawn, soft afternoon light.
```

## ต้นไม้แห่งความทรงจำ / หอดูดาว (เผื่อเฟส 2–3)

```
A big blooming cherry blossom tree in a sunny garden with a wooden bench under it
and a small wooden signpost, petals falling, empty bench (no people) ...
```
```
A cozy wooden rooftop observatory at night, a brass telescope, a blanket on the floor,
a huge starry sky with constellations, no people ...
```

## หลังได้ภาพแล้ว

ส่งไฟล์ PNG หรือ JPG มาในแชท บอกว่าเป็นห้องไหน ผมจะ:
1. ตัดส่วนสีเขียวในหน้าต่างให้โปร่งใส
2. แปลงเป็น WebP ให้ไฟล์เล็ก โหลดเร็วบนมือถือ
3. แก้ `js/rooms.js` ให้พื้น ที่นั่ง เตียง และโคมไฟตรงกับภาพใหม่
