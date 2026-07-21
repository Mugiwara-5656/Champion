import { KEYS } from "../data/poses.js";
import { MC, ML, SEG } from "../data/muscles.js";

export function caps(ctx, x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 1) return;
  ctx.save(); ctx.translate((x1 + x2)/2, (y1 + y2)/2); ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath(); ctx.roundRect(-len/2, -r, len, r*2, r); ctx.fill(); ctx.restore();
}

export function renderFilter(ctx, W, H, j, active, sec, xray, tick, chain, progress) {
  ctx.clearRect(0, 0, W, H);
  const px = k => j[k].x*W, py = k => j[k].y*H;
  const pulse = .55 + .45*Math.sin(tick*.08);

  const sA = xray ? .09 : .50, sR = xray ? 20 : 48, sG = xray ? 40 : 62, sB = xray ? 92 : 88;
  const segs = [["lSh","rSh",.048],["lHip","rHip",.044],["lSh","lEl",.038],["rSh","rEl",.038],["lEl","lWr",.030],["rEl","rWr",.030],["lSh","lHip",.065],["rSh","rHip",.065],["lHip","lKnee",.054],["rHip","rKnee",.054],["lKnee","lAnk",.038],["rKnee","rAnk",.038]];
  segs.forEach(([j1, j2, rf]) => { ctx.fillStyle = `rgba(${sR},${sG},${sB},${sA})`; caps(ctx, px(j1), py(j1), px(j2), py(j2), rf*H); });
  ctx.fillStyle = `rgba(${sR},${sG},${sB},${sA})`;
  ctx.beginPath(); ctx.ellipse(px("head"), py("head"), .062*W, .072*H, 0, 0, Math.PI*2); ctx.fill();

  const skA = xray ? .50 : .18;
  ctx.strokeStyle = `rgba(0,212,255,${skA})`; ctx.lineWidth = xray ? 1.5 : .8; ctx.setLineDash([4, 3]);
  [["head","lSh"],["head","rSh"],["lSh","rSh"],["lSh","lEl"],["lEl","lWr"],["rSh","rEl"],["rEl","rWr"],["lSh","lHip"],["rSh","rHip"],["lHip","rHip"],["lHip","lKnee"],["lKnee","lAnk"],["rHip","rKnee"],["rKnee","rAnk"]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke(); });
  ctx.setLineDash([]);

  KEYS.forEach(k => {
    const r = k === "head" ? .018*W : .010*W;
    ctx.save(); ctx.shadowColor = "rgba(0,212,255,.9)"; ctx.shadowBlur = xray ? 14 : 5;
    ctx.fillStyle = xray ? "rgba(0,212,255,.9)" : "rgba(0,212,255,.55)";
    ctx.beginPath(); ctx.arc(px(k), py(k), r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  // Derive active/secondary muscle sets — chain-driven if provided, else legacy pSet/sSet
  const isChain = Array.isArray(chain);
  let activeSet, secSet;
  if (isChain) {
    activeSet = new Set();
    secSet = new Set();
    const p = typeof progress === "number" ? progress : 0;
    for (const e of chain) {
      if (e.t <= p) {
        if (e.w === "primary") activeSet.add(e.m);
        else if (e.w === "secondary") secSet.add(e.m);
      }
    }
  } else {
    activeSet = active;
    secSet = sec;
  }

  Object.entries(SEG).forEach(([key, segs2]) => {
    const isAct = activeSet.has(key), isSec = secSet.has(key);
    if (!isAct && !isSec) return;
    const [r, g, b] = MC[key] || [255, 255, 255];
    // Primary = full brightness. Secondary = ~55-60% of primary in chain mode, dimmer in legacy mode.
    const alpha = isAct
      ? (xray ? .60 + .28*pulse : .42 + .18*pulse)
      : (isChain
          ? (xray ? .36 + .16*pulse : .25 + .10*pulse)
          : (xray ? .28 : .16));
    const glow = isAct
      ? (xray ? 14 + 8*pulse : 8 + 4*pulse)
      : (isChain
          ? (xray ? 8 + 4*pulse : 5 + 2*pulse)
          : (xray ? 4 : 2));
    segs2.forEach(([j1, j2, rf]) => {
      const x1 = px(j1), y1 = py(j1), x2 = px(j2), y2 = py(j2);
      const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1), mr = rf*H*.80;
      ctx.save();
      ctx.shadowColor = `rgba(${r},${g},${b},.95)`; ctx.shadowBlur = glow;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(alpha*2.2, 1)})`;
      ctx.lineWidth = isAct ? 1.2 : .6;
      ctx.translate((x1 + x2)/2, (y1 + y2)/2); ctx.rotate(ang);
      ctx.beginPath(); ctx.roundRect(-len*.44, -mr, len*.88, mr*2, mr);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    if (isAct && xray) {
      const s = segs2[0]; if (!s) return;
      const lx = (px(s[0]) + px(s[1]))/2, ly = (py(s[0]) + py(s[1]))/2 - .03*H;
      ctx.save();
      ctx.font = `bold ${Math.round(.026*H)}px Inter,system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = `rgba(${r},${g},${b},.9)`; ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(${r},${g},${b},.95)`;
      ctx.fillText(ML[key] || key, lx, ly);
      ctx.restore();
    }
  });

  if (xray) { ctx.fillStyle = "rgba(0,0,30,.025)"; for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 2); }
}
