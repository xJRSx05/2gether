import { PAGE_LABEL } from './ui.js';
import { confetti } from './fx.js';
import { msgPreview } from './stickers.js';
import { toast } from './ui.js';
import { mountScene } from './scene.js';
import { bondInfo } from './bond.js';
import { isHost } from './host.js';
import { partnerPushEnabled } from './push.js';
import { dayNumber, isMilestone } from './days.js';
import { openTV, tvOpen, joinTV } from './tv.js';
import { openMusic, joinMusic, musicTogether } from './music.js';
import { svg } from './media-util.js';
import { bump, onEco, openEco, decorFor, catAccFor, treeArt, paintQuestBadge, QUEST_ICON, ACT_LV, bondLevel } from './eco.js';
import { skyFireworks } from './fx.js';
import { modal } from './play-invite.js';
import { avatarSvg } from './avatar.js';
import { catSvg } from './cat.js';
import { esc } from './ui.js';

// ห้องที่ตัวละครเดินได้ทั้งหมด (ใช้ตอนจับมือพากันย้ายห้อง และตอนลุกจากที่นั่งในห้องที่ไม่ได้เปิดอยู่)
const ROOMS = new Map();
export const isRoomRoute = (r) => ROOMS.has(r);
const ROOM_NAME = { home: 'ห้องนั่งเล่น', bedroom: 'ห้องนอน', kitchen: 'ห้องครัว', garden: 'สวน' };
// ตัวละครนั่ง/นอนค้างอยู่ห้องไหน (ล่าสุด) ตัวจะอยู่ที่นั่นจนกว่าจะกลับไปกดลุก
export function anchorRoom() {
  let best = null;
  ROOMS.forEach((R, route) => {
    try {
      const p = JSON.parse(localStorage.getItem(`2gether.pos.${R.id}`) || 'null');
      if (p?.sit && (!best || (p.at || 0) > (best.pos.at || 0))) best = { route, R, pos: { room: p.room, x: p.x, y: p.y, sit: true } };
    } catch { /* ไม่เป็นไร */ }
  });
  return best;
}
// การ์ดชวนจับมือ หน้าตาเดียวกับคำชวนทำกิจกรรม
function handInvite(ctx, who, onYes, onNo) {
  const pav = ctx.partnerPresence?.avatar || ctx.partner?.avatar;
  const { ov, close } = modal('invite-pop hand-invite', `
    <div class="ip-art hand-ip"><span class="hi-av">${avatarSvg(pav)}</span><span class="hi-heart" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><path fill="#E0607E" d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/></svg></span><span class="hi-av me">${avatarSvg(ctx.me.avatar)}</span><span class="ip-cat">${catSvg(ctx.home?.cat_color)}</span></div>
    <h2>${esc(who)} ชวนจับมือเดินด้วยกัน</h2>
    <p class="sheet-sub">จับมือแล้ว ${esc(who)} เดินนำ ไปห้องไหนเราก็ไปด้วย</p>
    <div class="ip-btns"><button type="button" class="btn primary" data-yes>จับมือ</button><button type="button" class="btn" data-no>ไว้ก่อน</button></div>`, 'คำชวนจับมือ');
  let done = false;
  const finish = (fn) => { if (done) return; done = true; clearTimeout(timer); close(); fn?.(); };
  const timer = setTimeout(() => finish(onNo), 60000);
  navigator.vibrate?.([80, 60, 80]);
  ov.querySelector('[data-yes]').addEventListener('click', () => finish(onYes));
  ov.querySelector('[data-no]').addEventListener('click', () => finish(onNo));
  ov.addEventListener('click', (e) => { if (e.target === ov) finish(onNo); });
}

const PET_WINDOW = 60000;

// สร้างหน้า "ห้องที่เดินได้" หนึ่งห้อง (ห้องนั่งเล่น/ห้องนอน) ส่วนที่เหมือนกันอยู่ที่นี่:
// ฉาก อีกคนเดินสด แมว แถบ Bond ตัวนับวัน สถานะ ส่วนที่ต่างกัน (ปุ่ม) มาจาก cfg
//   cfg = { route, room, label, ariaLabel, actionsHtml, catRule(ctx), bind(api), refresh(api) }
// เมนูท่าทางเมื่อแตะตัวละครอีกคน
const ACTS = [
  ['hug', 'กอด', '<path d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/>'],
  ['pat', 'ลูบหัว', '<path d="M5 13c0-4 3-7 7-7s7 3 7 7"/><path d="M8 6l1-3M12 5V2M16 6l-1-3"/><path d="M4 14h16"/>'],
  ['kiss', 'หอมแก้ม', '<path d="M7 9a5 5 0 0 1 10 0c0 4-5 9-5 9S7 13 7 9z"/><path d="M10 9q2 2 4 0"/>'],
  ['highfive', 'ไฮไฟว์', '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.6-3L4 13.5a1.5 1.5 0 0 1 2.7-1.3L8 14"/>'],
  ['hand', 'จับมือ', '<path d="M4 14l4-4 3 2 3-3 3 2 3-3"/><path d="M4 18h16"/>'],
  ['dance', 'เต้น', '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'],
  ['piggy', 'ขี่หลัง', '<circle cx="9" cy="5" r="2"/><circle cx="15" cy="8" r="2"/><path d="M9 7l2 5 4-2M15 10v5l-2 5M15 15l3 5"/>'],
  ['spin', 'จับมือหมุน', '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>'],
  ['feed', 'ป้อนขนม', '<path d="M4 14h16v6H4z"/><path d="M4 14q8-7 16 0"/><circle cx="12" cy="8" r="2"/>'],
];
// ท่าทางกับอีกคน (ใช้ทั้งแถวปุ่มใต้ฉาก และการแตะตัวอีกคน = กอด)
function runAct(ctx, k) {
  const scene = appScene;
  if (!scene) return;
  const who = ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
  if (!scene.partnerHere()) { toast(`รอ${who}มาอยู่ห้องเดียวกันก่อนนะ`); return; }
  if (k === 'hand' && scene.holding()) { scene.releaseHands(true); return; }
  if (ACT_LV[k] && bondLevel(ctx) < ACT_LV[k]) { toast(`ท่านี้ปลดล็อกเมื่อ Bond ถึง Lv.${ACT_LV[k]}`); return; }
  if (scene.partnerResting()) { toast(`${who}กำลังพักอยู่ ลองตอนเขายืนนะ`); return; }
  if (k === 'hand') {
    ctx.send('hand', { t: 'req', room: scene.roomId });
    toast(`ชวน${who}จับมือแล้ว รอเขากดรับนะ`);
    return;
  }
  if (scene.doAct(k) && (k === 'hug' || k === 'kiss')) bump(ctx, 'touch').catch(() => {});
}
// เครื่องเล่นแผ่นเสียง (มีโต๊ะเล็กหรือวางบนโต๊ะข้างเตียง) แผ่นหมุนเมื่อมีเพลงเล่น
const recordSvg = (table) => `<svg viewBox="0 0 64 ${table ? 58 : 24}" aria-hidden="true">
  ${table ? '<rect x="6" y="22" width="52" height="7" rx="3" fill="#B98757" stroke="#7A5233" stroke-width="2"/><path d="M12 29v27M52 29v27" stroke="#7A5233" stroke-width="4" stroke-linecap="round"/><path d="M14 46h36" stroke="#7A5233" stroke-width="3"/>' : ''}
  <g transform="translate(0 ${table ? 0 : 2})">
    <rect x="8" y="8" width="48" height="14" rx="4" fill="#E9C08B" stroke="#7A5233" stroke-width="2"/>
    <g class="rp-disc"><ellipse cx="28" cy="9" rx="16" ry="5" fill="#2B2430"/><ellipse cx="28" cy="9" rx="10" ry="3" fill="none" stroke="#4A4050" stroke-width="1"/><ellipse cx="28" cy="9" rx="4" ry="1.6" fill="#F2617F"/></g>
    <path d="M50 4v6l-10 4" fill="none" stroke="#5A5A62" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="4" r="2.2" fill="#5A5A62"/>
    <circle cx="49" cy="16" r="1.6" fill="#7A5233"/>
  </g>
</svg>`;
const actBarHtml = () => `<div class="act-bar" id="actBar" role="group" aria-label="ท่าทางกับอีกคน">${ACTS.map(([k, label, ico]) => `<button type="button" class="act-btn" data-k="${k}">${ACT_LV[k] ? `<em class="act-lock">Lv.${ACT_LV[k]}</em>` : ''}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ico}</svg><span>${label}</span></button>`).join('')}</div>`;
let appScene = null;

export function createRoomView(cfg) {
  const R = cfg.room;
  ROOMS.set(cfg.route, R);
  let scene = null;
  let el = null;
  let appCtx = null;
  let lastStatus = '';
  let tickT = 0;
  let msgT = 0;
  let lastMyPet = 0;
  let lastBond = null;
  let lastPartnerPet = 0;
  let bound = false;
  let carryT = 0;
  let offEco = null;
  let treeHit = null;
  let lastFw = 0;
  function paintEco(ctx) {
    if (!scene || !el) return;
    scene.setDecor(decorFor(ctx, R.id));
    scene.setCatAcc(catAccFor(ctx));
    if (cfg.route === 'garden') {
      const art = treeArt(ctx);
      if (!treeHit) treeHit = scene.addProp({ x: 425, y: 372, w: 150, h: 190, html: art, label: 'ต้นไม้ของเรา แตะเพื่อดูและรดน้ำ', cls: 'tree', onTap: () => openEco(ctx) });
      else if (treeHit.previousElementSibling?.classList.contains('prop')) treeHit.previousElementSibling.innerHTML = art;
    }
    if (el.fwBtn) el.fwBtn.hidden = bondLevel(ctx) < 10;
    paintActBar();
    paintQuestBadge();
  }
  // มาถึงห้องใหม่พร้อมกันหลังจับมือย้ายห้อง: จับมือต่อเมื่ออีกคนเข้ามาในห้อง
  function resumeCarry(ctx) {
    const c = ctx.handCarry;
    if (!c || !scene) return;
    if (Date.now() - c.at > 15000) { ctx.handCarry = null; return; }
    if (c.to !== cfg.route) return;
    if (!scene.partnerHere()) return;
    ctx.handCarry = null;
    clearInterval(carryT);
    scene.holdHands(c.leader);
    paintActBar();
  }

  const whereText = (pp, name) => {
    if (pp.sleeping) return pp.page === cfg.route ? `${name} หลับอยู่ข้างๆ คุณ` : `${name} หลับอยู่ในห้องนอน`;
    if (pp.page === cfg.route) return `${name} อยู่ใน${cfg.label}กับคุณ`;
    if (pp.page === 'away') return pp.room === cfg.route ? `${name} สลับแอปอยู่ ตัวยังอยู่ตรงนี้นะ` : `${name} สลับแอปไปชั่วครู่`;
    if (pp.page === 'chat') return `${name} กำลังแชทอยู่`;
    return `${name} อยู่ที่${PAGE_LABEL[pp.page] || 'ห้องอื่น'}`;
  };

  // ปุ่มดูหนัง: ขึ้นเมื่อนั่งโซฟาทั้งคู่ (หรือนั่งคนเดียวตอนอีกคนไม่ได้เปิดแอป)
  function paintMovie() {
    if (!el?.movieBtn || !scene) return;
    const both = scene.isTogether();
    const partnerOn = Boolean(appCtx?.partnerPresence && appCtx.partnerPresence.page !== 'away');
    const sitting = scene.isResting();
    const solo = sitting && !partnerOn;
    // นั่งอยู่คนเดียวแต่อีกคนเปิดแอปอยู่: ปุ่มบอกให้รอ แตะแล้วเรียกเขามานั่งด้วย
    const wait = sitting && partnerOn && !both;
    el.movieBtn.hidden = !(both || solo || wait);
    el.movieBtn.classList.toggle('wait', wait);
    el.movieBtn.dataset.mode = wait ? 'wait' : 'go';
    const who = appCtx?.partnerPresence?.nickname || appCtx?.partner?.nickname || 'อีกคน';
    el.movieBtn.querySelector('span').textContent = both ? 'ดูหนังด้วยกัน' : wait ? `เรียก${who}มานั่งดูหนัง` : 'ดูหนัง';
  }

  // แถวปุ่มท่าทาง: จางลงเมื่ออีกคนไม่อยู่ห้องนี้ ปุ่มจับมือกลายเป็นปล่อยมือเมื่อจับอยู่
  function paintActBar() {
    if (!el?.actBar || !scene) return;
    el.actBar.classList.toggle('off', !scene.partnerHere());
    const lv = bondLevel(appCtx);
    el.actBar.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('locked', Boolean(ACT_LV[b.dataset.k]) && lv < ACT_LV[b.dataset.k]));
    const hb = el.actBar.querySelector('[data-k="hand"] span');
    if (hb) hb.textContent = scene.holding() ? 'ปล่อยมือ' : 'จับมือ';
  }

  const view = {
    mount(root, ctx) {
      appCtx = ctx;
      root.innerHTML = `
      <section class="home room-${cfg.route}">
        <div class="days-card" id="daysCard" hidden></div>
        <div class="stage-wrap" id="stageWrap">
          <div class="stage" id="stage" role="group" aria-label="${cfg.ariaLabel}"></div>
          <div class="hud" aria-hidden="false">
            <div class="cal" id="cal" hidden><span class="cal-top">Day</span><b id="calNum"></b><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/></svg></div>
            <div class="bond" id="bond" role="button" tabindex="0" aria-expanded="false" aria-label="ความผูกพัน แตะเพื่อดูแถบเต็ม">
              <span class="bond-ring" id="bondRing">
                <svg class="ring" viewBox="0 0 44 44" aria-hidden="true">
                  <defs><linearGradient id="bondGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2617F"/><stop offset="1" stop-color="#F59A45"/></linearGradient></defs>
                  <circle class="ring-bg" cx="22" cy="22" r="19"/>
                  <circle class="ring-fg" id="bondArc" cx="22" cy="22" r="19" pathLength="100" stroke-dasharray="0 100"/>
                </svg>
                <svg class="bond-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/></svg>
                <b class="bond-lv" id="bondLv"></b>
              </span>
              <span class="bond-level" id="bondLevel"></span>
              <div class="bond-bar" id="bondBar" role="progressbar" aria-label="ความผูกพัน" aria-valuemin="0" aria-valuemax="100"><i id="bondFill"></i></div>
              <span class="bond-pts" id="bondPts"></span>
            </div>
          </div>
          ${cfg.movie ? `<button type="button" class="movie-btn" id="movieBtn" hidden>${svg('tv', 22)}<span>ดูหนัง</span></button>` : ''}
          <a class="stage-msg" id="stageMsg" href="#/chat" hidden></a>
          <button type="button" class="quest-btn" id="questBtn" aria-label="ภารกิจและร้านแต่งบ้าน">${QUEST_ICON}<span class="badge" data-quest-badge hidden></span></button>
          ${cfg.route === 'garden' ? '<button type="button" class="fw-btn" id="fwBtn" hidden><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg><span>จุดพลุ</span></button>' : ''}
          <a class="ghost-note" id="ghostNote" hidden></a>
          <p class="status" id="status" aria-live="polite"></p>
        </div>
        <div class="actions">${cfg.actionsHtml}</div>
        ${cfg.actBar ? actBarHtml() : ''}
        <p class="hint" id="nudgeHint"></p>
      </section>`;
      el = {
        root,
        status: root.querySelector('#status'),
        hint: root.querySelector('#nudgeHint'),
        level: root.querySelector('#bondLevel'),
        bar: root.querySelector('#bondBar'),
        fill: root.querySelector('#bondFill'),
        pts: root.querySelector('#bondPts'),
        arc: root.querySelector('#bondArc'),
        lv: root.querySelector('#bondLv'),
        ring: root.querySelector('#bondRing'),
        days: root.querySelector('#daysCard'),
        cal: root.querySelector('#cal'),
        calNum: root.querySelector('#calNum'),
        wrap: root.querySelector('#stageWrap'),
        stageMsg: root.querySelector('#stageMsg'),
      };

      const host = isHost(ctx);
      // ตัวเรานั่ง/นอนค้างอยู่ห้องอื่น: ห้องนี้ไม่มีตัวเรา (ดูได้อย่างเดียว)
      const anc = anchorRoom();
      const ghost = Boolean(anc && anc.route !== cfg.route);
      if (ghost) ctx.setPos(anc.pos);
      const initialCat = !host && ctx.partnerPresence?.cat ? ctx.partnerPresence.cat : ctx.catState;
      scene = mountScene(root.querySelector('#stage'), {
        room: R,
        season: ctx.me.season,
        me: ctx.me.nickname,
        avatar: ctx.me.avatar,
        catName: ctx.home?.cat_name || 'แมว',
        catColor: ctx.home?.cat_color,
        initialCat,
        catPresent: cfg.catRule(ctx),
        isHost: host,
        ghost,
        catAcc: catAccFor(ctx),
        on: {
          ghostTap: () => toast(`ตัวเรายัง${anc.R.restPose === 'lie' ? 'นอน' : 'นั่ง'}อยู่ที่${ROOM_NAME[anc.route] || 'ห้องเดิม'} กลับไปกดลุกก่อนนะ`),
          move: (m) => ctx.send('go', { ...m, room: R.id }),
          state: (s) => { ctx.setPos(s); paintMovie(); },
          together: (t) => {
            ctx.lapRoles = t.v ? t : null; paintMovie();
            if (t.v && R.restPose === 'sit' && isHost(ctx)) bump(ctx, 'sit').catch(() => {});
          },
          musicProp: () => openMusic(ctx),
          cat: (m) => ctx.send('cat', m),
          catState: (c) => ctx.setCat(c),
          pet: () => view.myPet(ctx),
          // แตะตัวอีกคน: กอด (ได้ทุกห้อง) จับมืออยู่ = ปล่อยมือ
          tapPartner: () => { if (scene?.holding()) scene.releaseHands(true); else runAct(ctx, 'hug'); },
          act: (m) => ctx.send('act', { ...m, room: R.id }),
          handOff: () => { ctx.send('hand', { t: 'off', room: R.id }); paintActBar(); },
          notice: (t) => toast(t),
        },
      });
      appScene = scene;
      lastStatus = '';
      lastMyPet = 0;
      lastBond = null;
      lastPartnerPet = 0;
      // แถบ Bond ย่อได้ (จำไว้ในเครื่องนี้) ให้เห็นฉากกว้างขึ้น
      const bondEl = root.querySelector('#bond');
      const setMini = (mini) => {
        bondEl.classList.toggle('mini', mini);
        bondEl.setAttribute('aria-expanded', String(!mini));
        try { localStorage.setItem('2gether.bondOpen', mini ? '0' : '1'); } catch { /* ไม่เป็นไร */ }
      };
      let mini0 = true;
      try { mini0 = localStorage.getItem('2gether.bondOpen') !== '1'; } catch { /* ไม่เป็นไร */ }
      setMini(mini0);
      // กันเบราว์เซอร์เลื่อนหน้าไปหาปุ่มตอนแตะ (โฟกัส) หน้าจะได้ไม่ขยับ
      bondEl.addEventListener('pointerdown', (e) => e.preventDefault());
      bondEl.addEventListener('click', () => setMini(!bondEl.classList.contains('mini')));
      bondEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMini(!bondEl.classList.contains('mini')); } });
      cfg.bind({ ctx, el, scene, view });
      if (ghost) {
        const gn = root.querySelector('#ghostNote');
        gn.hidden = false;
        gn.href = `#/${anc.route}`;
        gn.innerHTML = `<span>ตัวเรา${anc.R.restPose === 'lie' ? 'นอน' : 'นั่ง'}อยู่ที่${ROOM_NAME[anc.route] || 'ห้องเดิม'}</span><b>กลับไปลุก</b>`;
        root.querySelector('.home').classList.add('is-ghost');
      }
      el.movieBtn = root.querySelector('#movieBtn');
      el.movieBtn?.addEventListener('click', () => {
        if (el.movieBtn.dataset.mode !== 'wait') { openTV(ctx); return; }
        const who = ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
        if (ctx.nudge()) toast(`เรียก${who}แล้ว พอเขามานั่งโซฟา ปุ่มดูหนังจะขึ้นให้`);
      });
      // เครื่องเล่นแผ่นเสียงในฉาก แตะแล้วเลือกเพลง
      // แตะแล้วตัวละครเดินไปหา แล้วค่อยเปิดหน้าเลือกเพลง
      if (cfg.musicProp) {
        const mp = cfg.musicProp;
        scene.addProp({ ...mp, html: recordSvg(mp.table), label: 'เครื่องเล่นแผ่นเสียง แตะเพื่อเลือกเพลง', cls: 'rp', onTap: () => scene.walkTo(mp.walk.x, mp.walk.y, () => openMusic(ctx)) });
      }
      el.actBar = root.querySelector('#actBar');
      // ของแต่งบ้าน ต้นไม้ (สวน) ปุ่มภารกิจ และปุ่มพลุ (Bond Lv.10 ในสวน)
      el.fwBtn = root.querySelector('#fwBtn');
      paintEco(ctx);
      offEco = onEco(() => paintEco(ctx));
      root.querySelector('#questBtn').addEventListener('click', () => openEco(ctx));
      el.fwBtn?.addEventListener('click', () => {
        if (Date.now() - lastFw < 8000) return;
        lastFw = Date.now();
        skyFireworks();
        ctx.send('eco', { t: 'fw' });
      });
      el.actBar?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-k]');
        if (!b) return;
        runAct(ctx, b.dataset.k);
        setTimeout(paintActBar, 50);
      });
      bound = true;
      if (ctx.handCarry) { clearInterval(carryT); carryT = setInterval(() => { resumeCarry(ctx); if (!ctx.handCarry) clearInterval(carryT); }, 400); }
      tickT = setInterval(() => view.update(ctx), 15000);
      view.update(ctx);

      // อีกคนเปิดแจ้งเตือนไว้ไหม (ถามเซิร์ฟเวอร์ครั้งเดียวต่อรอบเปิดหน้า)
      ctx.partnerPush = null;
      if (ctx.partner) {
        partnerPushEnabled().then((v) => { ctx.partnerPush = v; view.update(ctx); });
      }
    },

    unmount() {
      // ไปห้องอื่น (ยกเว้นเปิดแชท): ยกเลิกสิ่งที่ทำค้างอยู่ทั้งหมด
      if (scene && appCtx && !['chat', cfg.route].includes(appCtx.nextRoute)) {
        const next = appCtx.nextRoute;
        // จับมือเดินนำอยู่แล้วไปห้องอื่น: พาอีกคนไปด้วย
        if (scene.holding() === 'me' && ROOMS.has(next)) {
          appCtx.handCarry = { leader: 'me', to: next, at: Date.now() };
          appCtx.send('hand', { t: 'move', room: R.id, to: next });
        }
        const carry = appCtx.handCarry && appCtx.handCarry.to === next && Date.now() - appCtx.handCarry.at < 15000;
        scene.leaveRoom({ keepHand: Boolean(carry) });
      }
      clearInterval(carryT);
      offEco?.();
      offEco = null;
      treeHit = null;
      appScene = null;
      clearInterval(tickT);
      clearTimeout(msgT);
      scene?.destroy();
      scene = null;
      el = null;
      bound = false;
      appCtx = null;
    },

    update(ctx) {
      if (!el || !bound || !el.root.isConnected) return;
      const { partner, partnerPresence: pp } = ctx;
      const together = Boolean(pp);
      const name = pp?.nickname || partner?.nickname || '';

      scene?.setHost(isHost(ctx));
      scene?.setCatPresent(cfg.catRule(ctx), ctx.partnerPresence?.cat || ctx.catState);

      // ห้องของตัวละครอีกคน: ใช้ room (คงอยู่ตอนเปิดแชทหรือสลับแอป) ถ้าไม่มีใช้ page แบบเดิม
      const ppRoom = pp ? (pp.room || pp.page) : null;
      const inRoom = together && ppRoom === cfg.route;
      scene?.syncPartner(inRoom ? { nickname: name, avatar: pp.avatar, pos: pp.pos } : null);
      scene?.setPartnerIdle(inRoom && (pp.page === 'away' || pp.page === 'chat') ? pp.page : null);
      resumeCarry(ctx);
      paintActBar();
      if (inRoom) {
        const avKey = JSON.stringify(pp.avatar || null);
        if (avKey !== el.lastAv) { if (el.lastAv !== undefined) scene?.setPartnerAvatar(pp.avatar); el.lastAv = avKey; }
      }

      // ฉากตามสถานะ: อีกคนไม่อยู่ = บ้านเหงาๆ, เพิ่งกลับมา = แสงจากประตู + แมวโบกมือ
      const away = !together || (pp.page === 'away' && !inRoom);
      const status = !partner ? 'none' : away ? 'off' : 'on';
      el.wrap.classList.toggle('lonely', status !== 'on');
      el.status.classList.toggle('on', status === 'on');
      if (status !== lastStatus) {
        const was = lastStatus;
        lastStatus = status;
        if (status === 'on' && was === 'off') scene?.arrive(name);
        else if (scene?.isCatPresent()) {
          scene.say(
            status === 'on' ? `${name} อยู่บ้านด้วยนะ`
              : partner ? `${name} ยังไม่กลับบ้านเลย...`
                : 'รอใครสักคนกลับบ้านนะ...',
            7000,
          );
        }
      }
      scene?.setCatLook(ctx.home?.cat_color);

      el.status.textContent = together
        ? (pp.watching && pp.page !== 'away' ? `${name} กำลังดูหนัง` : whereText(pp, name))
        : partner ? `${name} ยังไม่ออนไลน์` : 'ยังไม่มีอีกคน ให้แฟนสร้างบัญชีด้วยอีเมลของเขาที่หน้าล็อกอิน';
      // อีกคนดูหนังอยู่: เข้าร่วมได้ทันที ไม่ต้องรอเขากดรับ
      if (together && pp.watching && pp.page !== 'away' && !tvOpen()) {
        const j = document.createElement('button');
        j.type = 'button'; j.className = 'status-join'; j.textContent = 'เข้าร่วม';
        j.addEventListener('click', () => joinTV(ctx));
        el.status.append(' · ', j);
      }
      // อีกคนฟังเพลงอยู่: กดฟังด้วยได้ทันที ไม่ต้องรอเขากดรับ
      else if (together && pp.listening?.uri && pp.page !== 'away' && !musicTogether()) {
        const j = document.createElement('button');
        j.type = 'button'; j.className = 'status-join'; j.textContent = 'ฟังด้วย';
        j.addEventListener('click', () => joinMusic(ctx));
        el.status.append(` · กำลังฟังเพลง `, j);
      }
      paintMovie();

      // Bond
      const b = bondInfo(ctx.home?.bond);
      el.level.textContent = `Bond Lv.${b.level}`;
      el.fill.style.width = `${b.pct}%`;
      el.bar.setAttribute('aria-valuenow', String(b.pct));
      el.pts.textContent = b.max ? `${b.points}` : `${b.points} / ${b.to}`;
      el.lv.textContent = String(b.level);
      el.arc.setAttribute('stroke-dasharray', `${b.pct} 100`);
      // ค่าเพิ่ม: หัวใจเต้นตุบหนึ่งที
      if (lastBond !== null && b.points > lastBond) { el.ring.classList.remove('gain'); void el.ring.offsetWidth; el.ring.classList.add('gain'); }
      lastBond = b.points;

      // ตัวนับวันอยู่บนหัวเว็บแล้ว การ์ดนี้จึงขึ้นเฉพาะวันฉลองหลักไมล์ (ยิงพลุวันละครั้ง)
      const n = dayNumber(ctx.home?.start_date);
      el.cal.hidden = !n;
      if (n) { el.calNum.textContent = String(n); el.cal.setAttribute('aria-label', `วันที่ ${n} ของเรา`); }
      if (n && isMilestone(n)) {
        el.days.hidden = false;
        el.days.classList.add('party');
        el.days.textContent = `ครบ ${n} วันแล้ว! ฉลองให้เรา`;
        const key = `2gether.party.${n}`;
        try {
          if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); setTimeout(confetti, 500); }
        } catch { /* โหมดส่วนตัวบางเบราว์เซอร์เก็บค่าไม่ได้ */ }
      } else if (n) {
        el.days.hidden = true;
      } else if (cfg.route === 'bedroom') {
        el.days.hidden = false;
        el.days.classList.remove('party');
        el.days.innerHTML = 'ยังไม่ได้ตั้งวันเริ่มคบ <a href="#/settings">ตั้งที่หน้าตั้งค่า</a>';
      } else {
        el.days.hidden = true;
      }

      cfg.refresh({ ctx, el, scene, view });
    },

    // เราลูบแมวเสร็จ: บอกอีกคน และถ้าเขาลูบไปเมื่อกี้ ได้โบนัส Bond
    myPet(ctx) {
      ctx.send('pet', { from: ctx.me.nickname, room: R.id });
      const now = Date.now();
      if (ctx.partnerPresence && now - lastPartnerPet < PET_WINDOW) {
        lastPartnerPet = 0;
        lastMyPet = 0;
        ctx.addBond('pet');
      } else {
        lastMyPet = now;
      }
    },

    // เหตุการณ์สดจากอีกคน
    onEvent(event, p, ctx) {
      if (!scene) return;
      if (event === 'go') {
        if (p?.room === R.id) scene.partnerGo(p);
      } else if (event === 'msg') {
        // ข้อความใหม่: ถ้าเขาอยู่ในห้องเป็นกรอบคำพูดเหนือหัว ไม่งั้นเป็นแถบข้อความบนฉาก กดแล้วไปหน้าแชท
        if (!p?.row || p.row.deleted) return;
        const body = msgPreview(p.row.body);
        if (scene.partnerSay(body)) return;
        const who = ctx.partnerPresence?.nickname || ctx.partner?.nickname || '';
        el.stageMsg.textContent = `${who}: ${body.length > 60 ? `${body.slice(0, 60)}...` : body}`;
        el.stageMsg.hidden = false;
        clearTimeout(msgT);
        msgT = setTimeout(() => { if (el) el.stageMsg.hidden = true; }, 10000);
      } else if (event === 'cat') {
        if (!isHost(ctx)) scene.catGo(p);
      } else if (event === 'act') {
        if (p?.room === R.id) scene.partnerAct(p.k);
      } else if (event === 'hand') {
        const who = ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
        if (p?.room !== R.id) return;
        if (p.t === 'req') {
          handInvite(ctx, who,
            () => { if (scene?.holdHands('partner')) ctx.send('hand', { t: 'ok', room: R.id }); else toast(`${who} ออกจากห้องไปแล้ว`); paintActBar(); },
            () => ctx.send('hand', { t: 'no', room: R.id }));
        } else if (p.t === 'move') {
          // คนเดินนำพาไปห้องอื่น: จอเราย้ายตามไปด้วย ยังจับมือกันอยู่
          if (scene.holding() !== 'partner' || !ROOMS.has(p.to)) return;
          ctx.handCarry = { leader: 'partner', to: p.to, at: Date.now() };
          location.hash = `#/${p.to}`;
        } else if (p.t === 'ok') { scene.holdHands('me'); paintActBar(); toast(`จับมือ${who}แล้ว เดินนำได้เลย`); }
        else if (p.t === 'no') toast(`${who} ยังไม่อยากจับมือตอนนี้`);
        else if (p.t === 'off') { scene.releaseHands(false); paintActBar(); toast(`${who} ปล่อยมือแล้ว`); }
      } else if (event === 'pet') {
        if (p?.room !== R.id || !scene.isCatPresent()) return;
        scene.happy();
        const now = Date.now();
        if (now - lastMyPet < PET_WINDOW) lastMyPet = 0; // อีกฝ่ายเป็นคนที่ 2 เขาเป็นคนบันทึกโบนัส
        else lastPartnerPet = now;
      }
    },

    // อีกคนกดเรียก: แมวดีใจและบอกให้รู้
    ping(fromName, kind) {
      scene?.happy(kind === 'miss' ? `${fromName || 'อีกคน'} คิดถึงเธอนะ` : `${fromName || 'อีกคน'} เรียกคุณ!`);
    },

    bondChanged(ctx) {
      view.update(ctx);
    },
  };
  return view;
}
