// ข้อมูลของห้องแต่ละห้อง: พิกัดทั้งหมดอยู่ในหน่วยของภาพห้อง (กว้าง 800 สูง 500)
// ถ้าเปลี่ยนภาพห้องเป็นของคุณเอง ให้ปรับตัวเลขในไฟล์นี้ให้ตรงกับภาพใหม่
export const LIVING = {
  id: 'home',
  art: 'art/rooms/living.svg',
  width: 800,
  height: 500,
  // กล่องของภาพนอกหน้าต่าง (ภาพห้องต้องเจาะรูโปร่งใสตรงนี้)
  window: { x: 100, y: 60, w: 230, h: 196 },
  // พื้นที่เดินได้
  floor: { x0: 40, x1: 760, y0: 356, y1: 472 },
  // โซฟา (แตะแล้วเดินไปนั่ง) และจุดนั่ง
  rest: { x: 424, y: 214, w: 312, h: 140 },
  restPose: 'sit',
  seats: [{ x: 520, y: 352 }, { x: 632, y: 352 }],
  // ประตู: จุดที่อีกคนเดินเข้า/ออกจากห้อง (อยู่นอกจอด้านซ้าย)
  door: { x: -30, y: 430 },
  start: { me: { x: 300, y: 430 }, cat: { x: 430, y: 438 } },
  // โคมไฟ (เรืองแสงตอนกลางคืน)
  lamp: { x: 767, y: 196 },
};

// ห้องนอน: เตียงคู่ (แตะแล้วเดินไปนอน) เตียงมี 2 ที่นอน
export const BEDROOM = {
  id: 'bedroom',
  art: 'art/rooms/bedroom.svg',
  width: 800,
  height: 500,
  window: { x: 100, y: 60, w: 230, h: 196 },
  floor: { x0: 40, x1: 760, y0: 356, y1: 472 },
  rest: { x: 440, y: 196, w: 310, h: 160 },
  restPose: 'lie',
  seats: [{ x: 540, y: 336 }, { x: 650, y: 336 }],
  // จุดที่แมวไปนอนตอนมีคนหลับ (พื้นหน้าเตียง)
  catSpot: { x: 470, y: 392 },
  lamp: { x: 418, y: 250 },
  door: { x: -30, y: 430 },
  start: { me: { x: 330, y: 430 }, cat: { x: 400, y: 440 } },
};

// ห้องครัว: เดินได้อย่างเดียว ไม่มีที่นั่ง/นอน เป็นห้องเล่นเกมทำอาหาร
export const KITCHEN = {
  id: 'kitchen',
  art: 'art/rooms/kitchen.svg',
  lamp: { x: 600, y: 46 },
  width: 800,
  height: 500,
  window: { x: 100, y: 60, w: 230, h: 196 },
  floor: { x0: 40, x1: 760, y0: 356, y1: 472 },
  door: { x: -30, y: 430 },
  start: { me: { x: 300, y: 430 }, cat: { x: 640, y: 440 } },
};

// สวน: เดินเล่นได้ มีแปลงดอกไม้และบ่อปลา ช่องโค้งในแนวพุ่มไม้เห็นวิวตามฤดู
export const GARDEN = {
  id: 'garden',
  art: 'art/rooms/garden.svg',
  lamp: { x: 760, y: 259 },
  width: 800,
  height: 500,
  window: { x: 100, y: 60, w: 230, h: 196 },
  floor: { x0: 40, x1: 760, y0: 356, y1: 472 },
  // ม้านั่งไม้ (แตะแล้วเดินไปนั่ง) นั่งด้วยกัน = พิงไหล่
  rest: { x: 30, y: 292, w: 190, h: 96 },
  restPose: 'sit',
  pair: 'lean',
  seats: [{ x: 88, y: 380 }, { x: 156, y: 380 }],
  door: { x: -30, y: 430 },
  start: { me: { x: 300, y: 430 }, cat: { x: 640, y: 440 } },
};

// ไฟล์ภาพนอกหน้าต่างของแต่ละฤดู
export const WINDOW_ART = {
  summer: 'art/windows/summer.svg',
  rain: 'art/windows/rain.svg',
  cool: 'art/windows/cool.svg',
  spring: 'art/windows/spring.svg',
  autumn: 'art/windows/autumn.svg',
};

// โทนแสงในห้องตามฤดู
export const SEASON_TINT = {
  summer: 'rgba(255, 200, 90, .10)',
  rain: 'rgba(30, 60, 110, .30)',
  cool: 'rgba(130, 110, 200, .16)',
  spring: 'rgba(255, 170, 200, .10)',
  autumn: 'rgba(140, 60, 10, .24)',
};
