import { CONFIG } from './config.js';
import { pointInCircle, segmentCircleCollision } from './utils.js';

export function checkBladeMarbleCollision(sword, target) {
  if (!target.alive) return false;
  const tip = sword.getBladeTip();
  if (pointInCircle(tip.x, tip.y, target.x, target.y, target.radius)) {
    return { hit: true, x: tip.x, y: tip.y };
  }
  const seg = sword.getBladeSegment();
  if (segmentCircleCollision(seg.x1, seg.y1, seg.x2, seg.y2, target.x, target.y, target.radius)) {
    return { hit: true, x: (seg.x1 + seg.x2) / 2, y: (seg.y1 + seg.y2) / 2 };
  }
  return false;
}

export function checkBladeBladeCollision(swordA, swordB) {
  const a = swordA.getBladeSegment();
  const b = swordB.getBladeSegment();
  const dx1 = a.x2 - a.x1;
  const dy1 = a.y2 - a.y1;
  const dx2 = b.x2 - b.x1;
  const dy2 = b.y2 - b.y1;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 0.0001) return false;
  const t = ((b.x1 - a.x1) * dy2 - (b.y1 - a.y1) * dx2) / denom;
  const u = ((b.x1 - a.x1) * dy1 - (b.y1 - a.y1) * dx1) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function processCombat(marbles, particles) {
  const kills = [];
  const hits = [];
  const damageEvents = [];
  for (let i = 0; i < marbles.length; i++) {
    const a = marbles[i];
    if (!a.alive) continue;
    for (let j = 0; j < marbles.length; j++) {
      if (i === j) continue;
      const b = marbles[j];
      if (!b.alive) continue;

      if (checkBladeMarbleCollision(a.sword, b)) {
        const dmg = a.bladeBoost ? CONFIG.SWORD_DAMAGE * CONFIG.POWERUP_BLADE_MULT : CONFIG.SWORD_DAMAGE;
        const blocked = b.takeDamage(dmg, a.x, a.y);
        const hx = (a.sword.getBladeTip().x + b.x) / 2;
        const hy = (a.sword.getBladeTip().y + b.y) / 2;
        if (blocked) {
          particles.emitSparks(hx, hy, '#00FFFF', 12);
          hits.push({ x: hx, y: hy, killer: a, victim: b, blocked: true });
        } else {
          particles.emitSparks(hx, hy, a.color, 8);
          hits.push({ x: hx, y: hy, killer: a, victim: b, blocked: false });
        }
        damageEvents.push({ attacker: a, victim: b, amount: dmg });
        a.totalDamageDealt += dmg;
        if (!b.alive) {
          a.kills++;
          kills.push({ killer: a, victim: b, x: hx, y: hy });
        }
      }

      if (checkBladeBladeCollision(a.sword, b.sword)) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        particles.emitSparks(mx, my, '#ffffff', 5);
        hits.push({ x: mx, y: my, killer: a, victim: b, blade: true });
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        a.applyKnockback(-dx / dist, -dy / dist);
        b.applyKnockback(dx / dist, dy / dist);
      }
    }
  }
  return { kills, hits, damageEvents };
}
