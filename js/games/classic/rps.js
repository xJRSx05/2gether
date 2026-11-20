import { classic, other, layout } from './kit.js';

const FACE = { r: '✊', p: '✋', s: '✌️' };
const NAME = { r: 'ค้อน', p: 'กระดาษ', s: 'กรรไกร' };
const BEATS = { r: 's', p: 'r', s: 'p' };
const GOAL = 3;

export const rps = classic({
  id: 'rps',
  title: 'เป่ายิ้งฉุบ',
  desc: 'เลือกพร้อมกันทั้งคู่ แล้วเปิดพร้อมกัน ใครชนะ 3 รอบก่อนเป็นผู้ชนะ',
  create({ el, role, send, end, partnerName }) {
    const score = { a: 0, b: 0 };
    let round = 0;
    let mine = null;
    let theirs = null;
    let busy = false;
    let over = false;
    const L = layout(el, {
      board: '<div class="rp-stage"><div class="rp-hand" id="rpMe">❔</div><div class="rp-hand" id="rpOp">❔</div></div><p class="cl-score" id="rpScore"></p>',
      extra: `<div class="rp-pick">${Object.keys(FACE).map((k) => `<button class="rp-btn" data-v="${k}" type="button" aria-label="${NAME[k]}">${FACE[k]}</button>`).join('')}</div>`,
    });
    const $me = el.querySelector('#rpMe');
    const $op = el.querySelector('#rpOp');

    function draw(reveal) {
      el.querySelector('#rpScore').textContent = `คุณ ${score[role]} · ${partnerName} ${score[other(role)]} (ชนะ ${GOAL} รอบก่อนได้)`;
      $me.textContent = reveal ? FACE[mine] : mine ? '✅' : '❔';
      $op.textContent = reveal ? FACE[theirs] : theirs ? '✅' : '❔';
      el.querySelectorAll('.rp-btn').forEach((b) => { b.disabled = Boolean(mine) || busy || over; });
      L.status(over ? '' : reveal ? '' : mine ? `รอ ${partnerName} เลือก...` : 'เลือกของคุณ');
    }
    function settle() {
      if (!mine || !theirs || busy) return;
      busy = true;
      draw(true);
      let msg = 'เสมอ เล่นรอบนี้ใหม่';
      if (mine !== theirs) {
        const iWin = BEATS[mine] === theirs;
        score[iWin ? role : other(role)] += 1;
        msg = iWin ? 'คุณชนะรอบนี้' : `${partnerName} ชนะรอบนี้`;
      }
      L.status(msg);
      const done = score.a >= GOAL || score.b >= GOAL;
      setTimeout(() => {
        mine = null; theirs = null; busy = false; round += 1;
        if (done) { over = true; draw(false); end({ winner: score.a > score.b ? 'a' : 'b' }); return; }
        draw(false);
      }, 1800);
    }
    function apply(a) {
      if (a.k === 'pick' && a.n === round && !theirs) { theirs = a.v; draw(false); settle(); }
    }
    el.querySelector('.rp-pick').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-v]');
      if (!b || mine || busy) return;
      mine = b.dataset.v;
      send({ k: 'pick', n: round, v: mine });
      draw(false);
      settle();
    });
    draw(false);
    return { onAct: apply };
  },
});
