import { classic, layout, esc } from './kit.js';
import { rand } from '../util.js';
import w1 from './words-th-1.js';
import w2 from './words-th-2.js';
import w3 from './words-th-3.js';
import w4 from './words-th-4.js';

// คลังคำไทยกว่า 1,000 คำ: { word, cat, clue }
export const WORDS = [w1, w2, w3, w4].flatMap((part) => Object.entries(part).flatMap(([cat, list]) => list.map((e) => {
  const i = e.indexOf(':');
  return { word: e.slice(0, i), cat, clue: e.slice(i + 1) };
})));

// แป้นทายเฉพาะพยัญชนะ 42 ตัว (ฃ ฅ เลิกใช้แล้ว) สระและวรรณยุกต์เปิดให้เห็นเอง
export const CONSONANTS = 'กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ'.split('');
const isCons = (c) => CONSONANTS.includes(c);
// อักษรที่ต้องเกาะกับตัวหน้า (สระบน/ล่าง วรรณยุกต์ การันต์)
const isMark = (c) => /[ัิ-ฺ็-๎]/.test(c);

// แบ่งคำเป็นช่อง: ตัวหลัก + เครื่องหมายที่เกาะอยู่
export function clusters(word) {
  const out = [];
  for (const ch of word) {
    if (isMark(ch) && out.length) out[out.length - 1].marks += ch;
    else out.push({ base: ch, marks: '' });
  }
  return out;
}

const LIVES = 6;
const HINT_COST = 1;

export const hangman = classic({
  id: 'hangman',
  title: 'ทายคำ',
  desc: 'ช่วยกันทายคำภาษาไทยทีละพยัญชนะ มีคำใบ้ 3 ข้อ เปิดให้ข้อแรก ข้อที่เหลือแลกด้วยหัวใจ',
  create({ el, seed, send, end }) {
    const pick = WORDS[Math.floor(rand(seed, 1) * WORDS.length)];
    const { word } = pick;
    const firstCons = [...word].find(isCons);
    const hints = [`หมวด: ${pick.cat}`, pick.clue, `พยัญชนะตัวแรกคือ "${firstCons}"`];
    const opened = new Set([0]);
    const tried = new Set();
    let over = false;
    const L = layout(el, {
      board: '<div class="hm-word" aria-live="polite"></div><div class="hm-top"><div class="hm-hearts" aria-live="polite"></div></div><ol class="hm-hints"></ol>',
      extra: `<label class="hm-type"><span>พิมพ์พยัญชนะด้วยคีย์บอร์ด</span>
        <input class="hm-input" type="text" inputmode="text" lang="th" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="แตะแล้วพิมพ์ เช่น ก ข ค" aria-label="พิมพ์พยัญชนะที่จะทาย"></label>
        <p class="hm-note" aria-live="polite"></p>
        <div class="hm-tried" aria-label="ตัวที่ทายไปแล้ว"></div>`,
    });
    const wordEl = L.board.querySelector('.hm-word');
    const heartsEl = L.board.querySelector('.hm-hearts');
    const hintsEl = L.board.querySelector('.hm-hints');
    const input = L.extra.querySelector('.hm-input');
    const note = L.extra.querySelector('.hm-note');
    const triedEl = L.extra.querySelector('.hm-tried');
    const wrong = () => [...tried].filter((c) => !word.includes(c)).length;
    const hearts = () => LIVES - wrong() - (opened.size - 1) * HINT_COST;
    const solved = () => [...word].filter(isCons).every((c) => tried.has(c));

    function draw() {
      wordEl.innerHTML = clusters(word).map(({ base, marks }) => {
        const hidden = isCons(base) && !tried.has(base) && !over;
        return `<span class="hm-ch${hidden ? ' hidden' : ''}">${hidden ? `◌${marks}` : esc(base + marks)}</span>`;
      }).join('');
      const h = Math.max(0, hearts());
      heartsEl.innerHTML = Array.from({ length: LIVES }, (_, i) => `<i class="${i < h ? 'on' : ''}"></i>`).join('');
      heartsEl.setAttribute('aria-label', `เหลือหัวใจ ${h} ดวง`);
      hintsEl.innerHTML = hints.map((t, i) => (opened.has(i) || over
        ? `<li class="open"><b>คำใบ้ ${i + 1}</b>${esc(t)}</li>`
        : `<li><button type="button" class="hm-hint" data-h="${i}" ${h <= HINT_COST ? 'disabled' : ''}>เปิดคำใบ้ ${i + 1} <span>ใช้ 1 หัวใจ</span></button></li>`)).join('');
      triedEl.innerHTML = [...tried].map((c) => `<span class="${word.includes(c) ? 'good' : 'bad'}">${c}</span>`).join('');
      input.disabled = over;
      L.status(over ? '' : 'ใครกดก็ได้ ช่วยกันทายพยัญชนะ');
    }
    function check() {
      const won = solved();
      const lost = hearts() <= 0;
      if (!won && !lost) return false;
      over = true;
      draw();
      end({ winner: won ? 'win' : 'lose', text: won ? `ทายถูกด้วยกัน! คำคือ "${word}"` : `เสียดายจัง คำคือ "${word}"` });
      return true;
    }
    function apply(a) {
      if (over) return;
      if (a.h !== undefined) {
        const i = Number(a.h);
        if (opened.has(i) || i < 0 || i >= hints.length || hearts() <= HINT_COST) return;
        opened.add(i);
      } else {
        if (!isCons(a.l) || tried.has(a.l)) return;
        tried.add(a.l);
      }
      if (!check()) draw();
    }
    L.board.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-h]');
      if (!b || over) return;
      const a = { h: Number(b.dataset.h) };
      send(a);
      apply(a);
    });
    // รับจากคีย์บอร์ดจริงหรือคีย์บอร์ดมือถือ: ทายเฉพาะพยัญชนะ ตัวอื่นเตือนเบาๆ
    let noteT = 0;
    const say = (t) => { note.textContent = t; clearTimeout(noteT); noteT = setTimeout(() => { note.textContent = ''; }, 2200); };
    const take = () => {
      if (input.isComposing) return;
      const chars = [...input.value];
      input.value = '';
      for (const ch of chars) {
        if (over) return;
        if (!isCons(ch)) { say(/[\u0E00-\u0E7F]/.test(ch) ? 'ทายเฉพาะพยัญชนะนะ สระกับวรรณยุกต์เปิดให้เอง' : 'สลับคีย์บอร์ดเป็นภาษาไทยก่อนนะ'); continue; }
        if (tried.has(ch)) { say(`ทาย "${ch}" ไปแล้ว`); continue; }
        const a = { l: ch };
        send(a);
        apply(a);
      }
    };
    input.addEventListener('input', take);
    input.addEventListener('compositionend', take);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    setTimeout(() => { if (!over && matchMedia('(pointer: fine)').matches) input.focus(); }, 300);
    draw();
    return { onAct: apply };
  },
});
