// 像素猫生成器 —— 视觉母体探索阶段 v5（轮廓规整化）
// 字符约定: '.'空 'B'主体 'D'深 'L'浅 'P'粉 'E'眼 'W'白 'O'轮廓 'C'补丁 'K'剪影

var W = 80;
var H = 60;
var DEF = { B: '#999999', D: '#777777', L: '#cccccc', P: '#f2a0a8', E: '#332620', W: '#ffffff', O: '#444444', C: '#f2913d', K: '#252a38' };

var HEAD_TOP = 10, HEAD_BOT = 26, BODY_TOP = 27, BODY_BOT = 51;

function fill(g, x, y, c, onlyIf) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  if (onlyIf && g[y][x] !== onlyIf) return;
  g[y][x] = c;
}

function smooth(x) {
  if (x < 0) x = 0;
  if (x > 1) x = 1;
  return x * x * (3 - 2 * x);
}

function bodyHalfF(o, t) {
  var wTop, wBot, peak;
  if (o.shape === 'chonk') { wTop = 0.88; wBot = 0.78; peak = 0.5; }
  else if (o.shape === 'slim') { wTop = 0.94; wBot = 0.7; peak = 0.45; }
  else if (o.shape === 'pear') { wTop = 0.58; wBot = 0.85; peak = 0.55; }
  else { wTop = 0.82; wBot = 0.7; peak = 0.5; }
  var f;
  if (t < peak) f = wTop + (1 - wTop) * smooth(t / peak);
  else f = 1 - (1 - wBot) * smooth((t - peak) / (1 - peak));
  return (o.bodyW / 2) * f;
}

function profileRows(count, fn) {
  var f = [];
  for (var i = 0; i < count; i++) f.push(fn(i / (count - 1)));
  var out = [];
  for (var j = 0; j < count; j++) {
    var a = f[Math.max(0, j - 1)], b = f[j], c = f[Math.min(count - 1, j + 1)];
    out.push(Math.max(1, Math.round((a + 2 * b + c) / 4)));
  }
  return out;
}

function outlinePass(g) {
  var marks = [];
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    if (g[y][x] === '.') continue;
    var edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) {
      var nx = x + d[0], ny = y + d[1];
      return nx < 0 || ny < 0 || nx >= W || ny >= H || g[ny][nx] === '.';
    });
    if (edge) marks.push([x, y]);
  }
  marks.forEach(function (m) { g[m[1]][m[0]] = 'O'; });
}

function applyPattern(g, o) {
  var cx = 40, ps = o.patterns || [];
  if (ps.indexOf('stripes') >= 0) {
    [33, 39, 45].forEach(function (y) {
      for (var x = 0; x < W; x++) { fill(g, x, y, 'D', 'B'); fill(g, x, y + 1, 'D', 'B'); }
    });
    fill(g, cx - 5, 11, 'D', 'B'); fill(g, cx - 5, 12, 'D', 'B');
    fill(g, cx + 5, 11, 'D', 'B'); fill(g, cx + 5, 12, 'D', 'B');
    fill(g, cx - 2, 12, 'D', 'B'); fill(g, cx + 2, 12, 'D', 'B');
  }
  if (ps.indexOf('belly') >= 0) {
    for (var y2 = BODY_TOP + 1; y2 <= BODY_BOT - 3; y2++)
      for (var x2 = cx - 10; x2 <= cx + 10; x2++) fill(g, x2, y2, 'L', 'B');
  }
  if (ps.indexOf('tuxedo') >= 0) {
    for (var y3 = BODY_TOP; y3 <= BODY_BOT; y3++)
      for (var x3 = cx - 13; x3 <= cx + 13; x3++) fill(g, x3, y3, 'L', 'B');
    for (var y4 = 49; y4 <= 54; y4++) {
      var ins = y4 === 49 ? 2 : y4 === 53 ? 1 : y4 === 54 ? 3 : 0;
      for (var x4 = cx - 17 + ins; x4 <= cx + 17 - ins; x4++) { fill(g, x4, y4, 'W', 'B'); fill(g, x4, y4, 'W', 'L'); }
    }
  }
  if (ps.indexOf('points') >= 0) {
    for (var y5 = 0; y5 <= HEAD_BOT; y5++)
      for (var x5 = 0; x5 < W; x5++) fill(g, x5, y5, 'D', 'B');
  }
  if (ps.indexOf('patches') >= 0) {
    [[24, 40, 10, 6, 'C'], [54, 34, 9, 6, 'D'], [30, 16, 6, 6, 'D']].forEach(function (p) {
      for (var y6 = 0; y6 < H; y6++) for (var x6 = 0; x6 < W; x6++) {
        var dx = (x6 - p[0]) / p[2], dy = (y6 - p[1]) / p[3];
        if (dx * dx + dy * dy <= 1) fill(g, x6, y6, p[4], 'B');
      }
    });
  }
  if (ps.indexOf('silhouette') >= 0) {
    for (var y7 = 0; y7 < H; y7++) for (var x7 = 0; x7 < W; x7++) {
      if (g[y7][x7] !== '.' && g[y7][x7] !== 'P') g[y7][x7] = 'K';
    }
  }
}

function applyFace(g, o, pose) {
  pose = pose || {};
  var cx = 40 + Math.round(pose.headLean || 0);
  var sq = pose.eyeSquint || 0;
  var off = o.eyeOff || 10;
  var y1 = 17;
  if (pose.eyeAngry) {
    fill(g, cx - off - 1, 17, 'E'); fill(g, cx - off, 18, 'E'); fill(g, cx - off + 1, 19, 'E');
    fill(g, cx + off + 1, 17, 'E'); fill(g, cx + off, 18, 'E'); fill(g, cx + off - 1, 19, 'E');
  } else if (sq > 0.55) {
    if (o.eye === 'wide') {
      [-2, -1, 0, 1, 2].forEach(function (dx) {
        fill(g, cx - off + dx, Math.abs(dx) === 2 ? 20 : 19, 'E');
        fill(g, cx + off + dx, Math.abs(dx) === 2 ? 20 : 19, 'E');
      });
    } else {
      [-1, 0, 1].forEach(function (dx) {
        fill(g, cx - off + dx, dx === 0 ? 19 : 20, 'E');
        fill(g, cx + off + dx, dx === 0 ? 19 : 20, 'E');
      });
    }
  } else {
    var hEye = Math.max(2, Math.round(5 * (1 - 0.55 * Math.min(1, sq / 0.55))));
    var ys = y1 + Math.floor((5 - hEye) / 2);
    if (o.eye === 'wide') {
      var x1 = cx - off - 3, x2 = cx + off - 2;
      for (var dx = 0; dx < 6; dx++) for (var dy = 0; dy < hEye; dy++) {
        fill(g, x1 + dx, ys + dy, 'E');
        fill(g, x2 + dx, ys + dy, 'E');
      }
      if (hEye >= 4) {
        fill(g, x1 + 1, ys, 'W'); fill(g, x1 + 2, ys + 1, 'W');
        fill(g, x2 + 1, ys, 'W'); fill(g, x2 + 2, ys + 1, 'W');
      }
    } else {
      for (var dy2 = 0; dy2 < hEye; dy2++) {
        fill(g, cx - off - 1, ys + dy2, 'E'); fill(g, cx - off, ys + dy2, 'E'); fill(g, cx - off + 1, ys + dy2, 'E');
        fill(g, cx + off - 1, ys + dy2, 'E'); fill(g, cx + off, ys + dy2, 'E'); fill(g, cx + off + 1, ys + dy2, 'E');
      }
      if (hEye >= 4) { fill(g, cx - off - 1, ys, 'W'); fill(g, cx + off - 1, ys, 'W'); }
    }
  }
  if (o.muzzle) {
    for (var x = cx - 6; x <= cx + 6; x++) {
      for (var my = 22; my <= 26; my++) fill(g, x, my, 'L');
    }
  }
  if (!o.noNose) { fill(g, cx - 1, 22, 'P'); fill(g, cx, 22, 'P'); fill(g, cx - 1, 23, 'P'); fill(g, cx, 23, 'P'); }
}

function buildCat(o, pose) {
  pose = pose || {};
  var earPress = pose.earPress || 0;
  var eyeSquint = pose.eyeSquint || 0;
  var tailSway = pose.tailSway || 0;
  var lean = Math.round(pose.headLean || 0);
  var g = [];
  for (var y = 0; y < H; y++) g.push(new Array(W).fill('.'));
  var cx = 40;
  var hcx = cx + lean;
  var headHalf = Math.round(o.headW / 2);

  var headProf = profileRows(HEAD_BOT - HEAD_TOP + 1, function (t) {
    var u = 2 * t - 1;
    return headHalf * (1 - 0.16 * u * u);
  });
  headProf.forEach(function (hh, i) {
    for (var x = hcx - hh; x <= hcx + hh; x++) fill(g, x, HEAD_TOP + i, 'B');
  });

  var rows = profileRows(BODY_BOT - BODY_TOP + 1, function (t) {
    return bodyHalfF(o, t);
  });
  var hbBottom = headProf[headProf.length - 1];
  rows[0] = Math.max(rows[0], hbBottom - 2);
  rows[1] = Math.max(rows[1], rows[0] - 1);
  rows.forEach(function (half, i) {
    for (var x2 = cx - half; x2 <= cx + half; x2++) fill(g, x2, BODY_TOP + i, 'B');
  });

  var earBaseHalf = Math.round((o.earBase - 1) / 2);
  earDraw(g, o, hcx - headHalf + 6, earBaseHalf, earPress);
  earDraw(g, o, hcx + headHalf - 6, earBaseHalf, earPress);

  pawDraw(g, cx);
  frontPawDraw(g, cx);

  var tc = o.tailColor || 'B';
  var maxHalf = rows.reduce(function (a, b) { return Math.max(a, b); }, 0);
  var tx = Math.min(W - 6, cx + maxHalf + 1);
  if (o.tail === 'up') {
    for (var yw = BODY_BOT - 3; yw <= BODY_BOT; yw++) {
      var be = cx + rows[yw - BODY_TOP];
      for (var gx = be + 1; gx < tx; gx++) fill(g, gx, yw, tc);
    }
    for (var y8 = BODY_TOP + 4; y8 <= BODY_BOT; y8++) {
      var lean = y8 < BODY_TOP + 7 ? -1 : 0;
      var ins = y8 === BODY_TOP + 4 ? 2 : (y8 === BODY_TOP + 5 ? 1 : 0);
      for (var k = ins; k < 6 - ins; k++) fill(g, tx + k + lean, y8, tc);
    }
  } else if (o.tail === 'down') {
    var y0 = BODY_BOT - 9;
    for (var yw2 = y0; yw2 <= y0 + 2; yw2++) {
      var be2 = cx + rows[yw2 - BODY_TOP];
      for (var gx2 = be2 + 1; gx2 < tx; gx2++) fill(g, gx2, yw2, tc);
    }
    for (var y9 = y0; y9 <= 54; y9++) {
      var ins2 = y9 === 54 ? 2 : (y9 === 53 ? 1 : 0);
      for (var k2 = ins2; k2 < 6 - ins2; k2++) fill(g, tx + k2, y9, tc);
    }
  } else if (o.tail === 'wrap') {
    var halfB = rows[rows.length - 1];
    var start = cx - halfB + 1;
    var lift = Math.round(Math.abs(tailSway) * 2.5);
    for (var y10 = BODY_BOT - 3; y10 <= BODY_BOT; y10++) {
      var ins3 = y10 === BODY_BOT - 3 ? 2 : (y10 === BODY_BOT ? 0 : 1);
      for (var x8 = start + ins3; x8 <= cx - 11; x8++) {
        var lr = 0;
        if (lift > 0 && x8 <= start + 1) lr = lift;
        else if (lift > 1 && x8 <= start + 3) lr = lift - 1;
        fill(g, x8, y10 - lr, tc, 'B');
      }
    }
  }

  applyPattern(g, o);
  if (o.outline) outlinePass(g);
  applyFace(g, o, pose);
  return g;
}

function earDraw(g, o, ex, baseHalf, press) {
  if (o.ear === 'round') {
    var hs = [1, 2, 3, 4, 5, 6, 6];
    hs.forEach(function (hh, i) {
      for (var x = ex - hh; x <= ex + hh; x++) fill(g, x, HEAD_TOP - 7 + i, 'B');
    });
    [3, 4, 5].forEach(function (i) {
      var ph = hs[i] - 2;
      if (ph >= 1) for (var x2 = ex - ph; x2 <= ex + ph; x2++) fill(g, x2, HEAD_TOP - 7 + i, 'P');
    });
  } else {
    var pr = press || 0;
    var h = Math.max(3, Math.round(o.earH * (1 - 0.55 * pr)));
    var prof = profileRows(h, function (t) {
      return 1 + (baseHalf - 1) * t;
    });
    prof[0] = pr > 0.35 ? 2 : 1;
    prof.forEach(function (hh, i) {
      var yy = HEAD_TOP - h + 1 + i;
      for (var x3 = ex - hh; x3 <= ex + hh; x3++) fill(g, x3, yy, 'B');
      if (i >= 4 && hh - 3 >= 1) {
        for (var x4 = ex - hh + 3; x4 <= ex + hh - 3; x4++) fill(g, x4, yy, 'P');
      }
    });
  }
}

function frontPawDraw(g, cx) {
  var spans = [
    { y: 49, a: 6, b: 1 },
    { y: 50, a: 7, b: 0 }, { y: 51, a: 7, b: 0 }, { y: 52, a: 7, b: 0 },
    { y: 53, a: 6, b: 1 },
    { y: 54, a: 5, b: 1 }
  ];
  spans.forEach(function (s) {
    for (var x = cx - s.a; x <= cx - s.b; x++) fill(g, x, s.y, 'B');
    for (var x2 = cx + s.b; x2 <= cx + s.a; x2++) fill(g, x2, s.y, 'B');
  });
  [50, 51].forEach(function (yy) {
    fill(g, cx - 3, yy, 'D', 'B');
    fill(g, cx + 3, yy, 'D', 'B');
  });
}

function pawDraw(g, cx) {
  var spans = [
    { y: 49, a: 15, b: 9 },
    { y: 50, a: 16, b: 8 }, { y: 51, a: 16, b: 8 }, { y: 52, a: 16, b: 8 },
    { y: 53, a: 15, b: 9 },
    { y: 54, a: 14, b: 10 }
  ];
  spans.forEach(function (s) {
    for (var x = cx - s.a; x <= cx - s.b; x++) fill(g, x, s.y, 'B');
    for (var x2 = cx + s.b; x2 <= cx + s.a; x2++) fill(g, x2, s.y, 'B');
  });
  [50, 51, 52].forEach(function (yy) {
    fill(g, cx - 11, yy, 'D', 'B');
    fill(g, cx + 11, yy, 'D', 'B');
  });
}

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

var SHADABLE = { B: 1, L: 1, D: 1, C: 1 };

function pixelColor(g, x, y, pal) {
  var key = g[y][x];
  if (key === '.') return null;
  var c = pal[key] || DEF[key] || '#000000';
  if (SHADABLE[key]) {
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

var VARIANTS = [
  { name: '起司橘胖', tag: '圆滚滚 · 奶油肚 · 虎纹', shape: 'chonk', bodyW: 58, headW: 38, ear: 'point', earH: 13, earBase: 14, eye: 'dot', eyeOff: 10, tail: 'up', patterns: ['stripes', 'belly'], muzzle: true, outline: true,
    palette: { B: '#f2913d', D: '#c96a1e', L: '#ffe6c0', P: '#f2a0a8', E: '#33261d', O: '#7a4419' } },
  { name: '煤球', tag: '黑 · 极简 · 大黄眼', shape: 'slim', bodyW: 45, headW: 35, ear: 'round', eye: 'wide', eyeOff: 10, tail: 'down', patterns: [], outline: false,
    palette: { B: '#34343e', D: '#26262e', L: '#4a4a58', P: '#f2a0a8', E: '#ffd94a' } },
  { name: '蓝灰绅士', tag: '灰蓝 · 优雅 · 有轮廓', shape: 'slim', bodyW: 48, headW: 35, ear: 'point', earH: 10, earBase: 10, eye: 'dot', eyeOff: 10, tail: 'up', patterns: [], outline: true,
    palette: { B: '#8a97ad', D: '#6b7890', L: '#ccd5e4', O: '#47516a', E: '#7fc97f' } },
  { name: '奶牛', tag: '黑白 · 白肚白爪', shape: 'chonk', bodyW: 55, headW: 38, ear: 'point', earH: 13, earBase: 14, eye: 'wide', eyeOff: 10, tail: 'up', patterns: ['tuxedo'], muzzle: true, outline: true,
    palette: { B: '#2f2f3a', D: '#23232c', L: '#f3eee3', O: '#1b1b22', E: '#ffd94a' } },
  { name: '三花', tag: '三花补丁 · 碎花', shape: 'pear', bodyW: 55, headW: 35, ear: 'round', eye: 'dot', eyeOff: 10, tail: 'up', patterns: ['patches'], muzzle: true, outline: true,
    palette: { B: '#f6efe0', C: '#f2913d', D: '#35353f', O: '#55403e', E: '#e8933e' } },
  { name: '雪团', tag: '纯白 · 粉耳 · 蓝眼', shape: 'chonk', bodyW: 48, headW: 38, ear: 'point', earH: 10, earBase: 10, eye: 'wide', eyeOff: 10, tail: 'wrap', tailColor: 'D', patterns: [], muzzle: true, outline: true,
    palette: { B: '#fbf8f1', D: '#e2d8c6', L: '#ffffff', O: '#d8cfc2', E: '#6fb7e8', P: '#f291b4' } },
  { name: '暹罗少爷', tag: '奶油身 · 深脸 · 蓝眼', shape: 'slim', bodyW: 48, headW: 35, ear: 'point', earH: 14, earBase: 10, eye: 'wide', eyeOff: 10, tail: 'up', tailColor: 'D', patterns: ['points'], muzzle: true, outline: false,
    palette: { B: '#efe4cd', D: '#6e5746', L: '#f7efdd', E: '#6fb7e8', P: '#d98a80' } },
  { name: '虎斑', tag: '棕虎斑 · 额头纹', shape: 'square', bodyW: 50, headW: 38, ear: 'point', earH: 13, earBase: 14, eye: 'dot', eyeOff: 10, tail: 'up', patterns: ['stripes'], muzzle: true, outline: true,
    palette: { B: '#bd8a4c', D: '#8c5c26', L: '#ecd6a8', O: '#5b3c1c', E: '#7fc97f' } },
  { name: '小方糕', tag: '方块 · 极简 · 奶桃色', shape: 'square', bodyW: 44, headW: 40, ear: 'point', earH: 6, earBase: 10, eye: 'dot', eyeOff: 10, tail: 'wrap', tailColor: 'D', patterns: [], outline: false,
    palette: { B: '#f5b896', D: '#d98f70', E: '#4a3b33', P: '#d97b6c' } },
  { name: '大耳橘', tag: '大耳朵 · 幼齿 · 蓝眼', shape: 'slim', bodyW: 45, headW: 35, ear: 'point', earH: 14, earBase: 14, eye: 'wide', eyeOff: 10, tail: 'up', patterns: ['belly'], outline: false,
    palette: { B: '#f7a463', D: '#d97f3a', L: '#ffe3c2', E: '#5ab2e8' } },
  { name: '曼基康', tag: '短腿梨形 · 尾巴绕前', shape: 'pear', bodyW: 58, headW: 35, ear: 'point', earH: 13, earBase: 14, eye: 'dot', eyeOff: 10, tail: 'wrap', tailColor: 'D', patterns: ['belly'], outline: true,
    palette: { B: '#9aa0ab', D: '#7b818d', L: '#d4d8e0', O: '#4c515c', E: '#e8933e' } },
  { name: '影', tag: '纯剪影 · 只剩眼睛', shape: 'slim', bodyW: 45, headW: 35, ear: 'point', earH: 14, earBase: 14, eye: 'wide', eyeOff: 10, tail: 'up', patterns: ['silhouette'], noNose: true, outline: false,
    palette: { K: '#252a38', E: '#ffd94a', P: '#3a4152' } }
];

if (typeof window !== 'undefined') window.CAT = { buildCat: buildCat, VARIANTS: VARIANTS, W: W, H: H, DEF: DEF, pixelColor: pixelColor };
if (typeof module !== 'undefined' && module.exports) module.exports = { buildCat: buildCat, VARIANTS: VARIANTS, W: W, H: H, DEF: DEF, pixelColor: pixelColor };
