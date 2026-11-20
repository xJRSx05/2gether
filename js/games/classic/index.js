import { xo } from './xo.js';
import { connect4 } from './connect4.js';
import { othello } from './othello.js';
import { checkers } from './checkers.js';
import { dots } from './dots.js';
import { battleship } from './battleship.js';
import { rps } from './rps.js';
import { memory } from './memory.js';
import { hangman } from './hangman.js';
import { pong } from './pong.js';
import { chess } from './chess.js';

// เกมคลาสสิก 13 เกม เรียงตามที่แสดงในห้องเกม
export const CLASSIC = [xo, connect4, othello, checkers, dots, battleship, rps, memory, hangman, pong, chess];
