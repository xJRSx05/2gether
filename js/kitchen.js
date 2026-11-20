import { createGameRoom } from './game-room.js';
import { KITCHEN } from './rooms.js';

// ห้องครัว: เกมทำอาหาร 2 เกม
export const kitchen = createGameRoom({
  route: 'kitchen',
  room: KITCHEN,
  label: 'ห้องครัว',
  ariaLabel: 'ห้องครัว แตะพื้นเพื่อเดิน แตะแมวเพื่อลูบ',
  games: ['cookcat', 'cooktog'],
  collects: [],
});
