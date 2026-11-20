// Bond: ระดับความผูกพัน 1-10 ตามแต้มสะสม
const BOND_LEVELS = [0, 20, 60, 120, 200, 300, 420, 560, 720, 900];

export function bondInfo(points) {
  const p = Math.max(0, Number(points) || 0);
  let level = 1;
  BOND_LEVELS.forEach((t, i) => { if (p >= t) level = i + 1; });
  const max = level >= BOND_LEVELS.length;
  const from = BOND_LEVELS[level - 1];
  const to = max ? from : BOND_LEVELS[level];
  return { level, points: p, from, to, max, pct: max ? 100 : Math.round(((p - from) / (to - from)) * 100) };
}
