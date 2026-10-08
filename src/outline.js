function key(x, y) {
  return `${x},${y}`;
}

function addSegment(segments, points, x0, y0, x1, y1) {
  const a = key(x0, y0);
  const b = key(x1, y1);
  points.set(a, { x: x0, y: y0 });
  points.set(b, { x: x1, y: y1 });
  if (!segments.has(a)) segments.set(a, []);
  segments.get(a).push(b);
}

export function traceOutline(mask, rows, cols, tileSize) {
  const segments = new Map();
  const points = new Map();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!mask[r][c]) continue;
      const x0 = c * tileSize;
      const y0 = r * tileSize;
      const x1 = (c + 1) * tileSize;
      const y1 = (r + 1) * tileSize;
      const up = r - 1 < 0 || !mask[r - 1][c];
      const down = r + 1 >= rows || !mask[r + 1][c];
      const left = c - 1 < 0 || !mask[r][c - 1];
      const right = c + 1 >= cols || !mask[r][c + 1];
      if (up) addSegment(segments, points, x0, y0, x1, y0);
      if (right) addSegment(segments, points, x1, y0, x1, y1);
      if (down) addSegment(segments, points, x1, y1, x0, y1);
      if (left) addSegment(segments, points, x0, y1, x0, y0);
    }
  }

  const visited = new Set();
  const loops = [];

  for (const [start, ends] of segments) {
    for (const firstEnd of ends) {
      if (visited.has(`${start}>${firstEnd}`)) continue;
      const loop = [];
      let cur = start;
      let nxt = firstEnd;
      while (!visited.has(`${cur}>${nxt}`)) {
        visited.add(`${cur}>${nxt}`);
        loop.push(points.get(cur));
        const outs = segments.get(nxt) || [];
        let following = null;
        for (const candidate of outs) {
          if (!visited.has(`${nxt}>${candidate}`)) {
            following = candidate;
            break;
          }
        }
        if (!following) break;
        cur = nxt;
        nxt = following;
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }

  return loops;
}

function simplify(loop) {
  const n = loop.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n];
    const b = loop[i];
    const c = loop[(i + 1) % n];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const dot = (b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y);
    if (Math.abs(cross) > 1e-6 || dot < 0) out.push(b);
  }
  return out.length >= 3 ? out : loop;
}

function roundedVertices(loop, radius) {
  const n = loop.length;
  const verts = [];
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n];
    const b = loop[i];
    const c = loop[(i + 1) % n];
    const la = Math.hypot(a.x - b.x, a.y - b.y);
    const lc = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.max(0, Math.min(radius, la / 2, lc / 2));
    const ax = la > 0 ? (a.x - b.x) / la : 0;
    const ay = la > 0 ? (a.y - b.y) / la : 0;
    const cx = lc > 0 ? (c.x - b.x) / lc : 0;
    const cy = lc > 0 ? (c.y - b.y) / lc : 0;
    verts.push({
      b,
      p1: { x: b.x + ax * r, y: b.y + ay * r },
      p2: { x: b.x + cx * r, y: b.y + cy * r },
    });
  }
  return verts;
}

export function strokeLoops(ctx, loops, radius) {
  for (const raw of loops) {
    const loop = simplify(raw);
    if (loop.length < 3) continue;
    const verts = roundedVertices(loop, radius);
    ctx.beginPath();
    ctx.moveTo(verts[0].p1.x, verts[0].p1.y);
    for (let i = 0; i < verts.length; i++) {
      ctx.lineTo(verts[i].p1.x, verts[i].p1.y);
      ctx.quadraticCurveTo(verts[i].b.x, verts[i].b.y, verts[i].p2.x, verts[i].p2.y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}

export function buildPath(loops, radius) {
  if (typeof Path2D === 'undefined') return null;
  const path = new Path2D();
  for (const raw of loops) {
    const loop = simplify(raw);
    if (loop.length < 3) continue;
    const verts = roundedVertices(loop, radius);
    path.moveTo(verts[0].p1.x, verts[0].p1.y);
    for (let i = 0; i < verts.length; i++) {
      path.lineTo(verts[i].p1.x, verts[i].p1.y);
      path.quadraticCurveTo(verts[i].b.x, verts[i].b.y, verts[i].p2.x, verts[i].p2.y);
    }
    path.closePath();
  }
  return path;
}
