// parts.js — 部件式像素猫：7 张透明 PNG 部件按姿势合成，动画保留
// 依赖 parts-data.js（window.PARTS）。替换素材 → 重跑 tools/parts-pipeline.js 即可
(function () {
  var P = window.PARTS;
  var W = 80, H = 60;
  var DEF = { B: '#f5b896', L: '#ffe9cf', P: '#ec9aa8', E: '#4a3b33', W: '#ffffff', D: '#d98f70', C: '#f2913d', K: '#252a38' };
  var shadeGrid = [];

  function newGrid() { var g = []; for (var y = 0; y < H; y++) g.push(new Array(W).fill('.')); return g; }
  function put(g, x, y, c) { if (x < 0 || x >= W || y < 0 || y >= H) return; g[y][x] = c; }

  function drawPart(g, sg, part, dx, dy) {
    dx = dx || 0; dy = dy || 0;
    var i = 0;
    for (var y = 0; y < part.h; y++) for (var x = 0; x < part.w; x++) {
      var c = part.data[i];
      if (c) {
        var gx = part.x0 + x + dx, gy = part.y0 + y + dy;
        if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
          g[gy][gx] = c;
          if (part.sdata[i]) sg[gy][gx] = 1;
        }
      }
      i++;
    }
  }
  function drawTail(g, sg, part, sway) {
    var lift = Math.round(Math.abs(sway) * 2.5);
    var startX = part.startX;
    var i = 0;
    for (var y = 0; y < part.h; y++) for (var x = 0; x < part.w; x++) {
      var c = part.data[i];
      if (c) {
        var gx = part.x0 + x, gy = part.y0 + y;
        var lr = 0;
        var rightEdge = startX + part.w - 1;
        if (lift > 0 && gx >= rightEdge - 1) lr = lift;
        else if (lift > 1 && gx >= rightEdge - 3) lr = lift - 1;
        if (gx >= 0 && gx < W && gy - lr >= 0 && gy - lr < H) {
          g[gy - lr][gx] = c;
          if (part.sdata[i]) sg[gy - lr][gx] = 1;
        }
      }
      i++;
    }
  }

  function buildCat(o, pose) {
    pose = pose || {};
    var press = pose.earPress || 0;
    var squint = pose.eyeSquint || 0;
    var sway = pose.tailSway || 0;
    var angry = pose.angry || 0;
    var lean = Math.max(-4, Math.min(4, Math.round(pose.headLean || 0)));
    var g = newGrid();
    shadeGrid = newGrid();
    drawPart(g, shadeGrid, P.body, 0, 0);
    drawTail(g, shadeGrid, P.tail, sway);
    drawPart(g, shadeGrid, P.head, lean, 0);
    drawPart(g, shadeGrid, press > 0.35 ? P['ears-down'] : P['ears-up'], lean, 0);
    drawPart(g, shadeGrid, angry ? P['eyes-angry'] : (squint > 0.55 ? P['eyes-squint'] : P['eyes-open']), lean, 0);
    return g;
  }

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function pixelColor(g, x, y) {
    var c = g[y][x];
    if (c === '.') return null;
    if (shadeGrid[y][x] === 1) {
      var above = y === 0 || g[y - 1][x] === '.';
      var below = y === H - 1 || g[y + 1][x] === '.';
      if (above || below) {
        var rgb = hexToRgb(c);
        var t = above ? 255 : 0;
        var k = above ? 0.3 : 0.2;
        return 'rgb(' + Math.round(rgb[0] + (t - rgb[0]) * k) + ',' + Math.round(rgb[1] + (t - rgb[1]) * k) + ',' + Math.round(rgb[2] + (t - rgb[2]) * k) + ')';
      }
    }
    return c;
  }

  var VARIANTS = [{ name: '小方糕', tag: '部件式 · 可换素材', palette: DEF }];

  if (typeof window !== 'undefined') window.CAT = { buildCat: buildCat, VARIANTS: VARIANTS, W: W, H: H, DEF: DEF, pixelColor: pixelColor, SCALE: 1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildCat: buildCat, VARIANTS: VARIANTS, W: W, H: H, DEF: DEF, pixelColor: pixelColor, SCALE: 1 };
})();