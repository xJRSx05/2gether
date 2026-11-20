import { createGameRoom } from './game-room.js';
import { GARDEN } from './rooms.js';

// สวน: ปลูกดอกไม้ (ลงสวนดอกไม้) ตกปลา (ลงตู้ปลาในครัว) จับหิ่งห้อยและเก็บดาว (ลงท้องฟ้าดูดาว)
export const garden = createGameRoom({
  route: 'garden',
  room: GARDEN,
  label: 'สวน',
  ariaLabel: 'สวน แตะพื้นเพื่อเดิน แตะแมวเพื่อลูบ',
  games: ['plant', 'fish', 'firefly', 'starcatch'],
  collects: [
    { kind: 'flower', title: 'สวนดอกไม้ของเรา', css: 'bed', empty: 'ยังไม่มีดอกไม้ ลองปลูกด้วยกันดูนะ' },
    { kind: 'fish', title: 'ตู้ปลา', css: 'tank', empty: 'ยังไม่มีปลา ลองตกปลาด้วยกันนะ' },
    { kind: 'star', title: 'ท้องฟ้าดูดาว', css: 'sky', empty: 'ยังไม่มีดวงดาว ลองจับหิ่งห้อยหรือเก็บดาวด้วยกันนะ' },
  ],
});
