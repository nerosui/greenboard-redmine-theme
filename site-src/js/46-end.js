/* ============ 7. end (normal flow): the sun comes up ============ */
const sun = $('.sun');
let sunTop = 0,
  sunR = 1;
function sunUnderHeader() {
  if (G < 6) return false;
  const edge = sunTop - sy + sunR - Math.sqrt(Math.max(0, sunR * sunR - Math.max(0, vw / 2 - 140) ** 2));
  return edge < 40;
}
function sunrise() {
  const t = clamp((sy - dawn + vh * 0.2) / (vh * 1.05));
  tf(sun, `translate3d(-50%,${lerp(phone ? 190 : 320, 0, E.out(t)).toFixed(1)}px,0)`);
}
