import { useEffect, useRef, useState } from "react";
import { MC, ML } from "../data/muscles.js";
import { renderFilter } from "../lib/filterRenderer.js";

const POSE_KEYS = [
  "head", "lSh", "rSh", "lEl", "rEl", "lWr", "rWr",
  "lHip", "rHip", "lKnee", "rKnee", "lAnk", "rAnk",
];
const LAST_PHASE_FALLBACK_DURATION = 1.5;

function poseFromArray(arr) {
  const o = {};
  for (let i = 0; i < POSE_KEYS.length; i++) {
    o[POSE_KEYS[i]] = { x: arr[i * 2], y: arr[i * 2 + 1] };
  }
  return o;
}

function nearestEntry(entries, t) {
  const n = entries.length;
  if (n === 0) return null;
  if (t <= entries[0].t) return entries[0];
  if (t >= entries[n - 1].t) return entries[n - 1];
  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (entries[mid].t < t) lo = mid;
    else hi = mid;
  }
  return Math.abs(entries[lo].t - t) <= Math.abs(entries[hi].t - t) ? entries[lo] : entries[hi];
}

function computePhaseIdx(t, phases) {
  let idx = 0;
  for (let i = 0; i < phases.length; i++) {
    if (phases[i].t <= t) idx = i;
    else break;
  }
  return idx;
}

function phaseDuration(phases, idx) {
  const nxt = phases[idx + 1];
  return nxt ? nxt.t - phases[idx].t : LAST_PHASE_FALLBACK_DURATION;
}

export default function TechniqueDetail({ tech, disc, onBack, onAskSensei }) {
  const [phIdx, setPhIdx] = useState(0);
  const [xray, setXray] = useState(false);
  const [spd, setSpd] = useState(1);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timelineRef = useRef(null);
  const tickRef = useRef(0);
  const animRef = useRef(null);
  const phIdxRef = useRef(0);

  const phase = tech.phases[phIdx];

  useEffect(() => { phIdxRef.current = phIdx; }, [phIdx]);

  useEffect(() => {
    phIdxRef.current = 0;
    setPhIdx(0);
  }, [tech]);

  useEffect(() => {
    let cancelled = false;
    timelineRef.current = null;
    if (!tech.videoSrc) return;
    fetch(`/timelines/${tech.id}.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled) timelineRef.current = data; })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tech.id, tech.videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function recompute() {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) return;
      const rect = video.getBoundingClientRect();
      const containerW = rect.width, containerH = rect.height;
      if (!containerW || !containerH) return;
      const scale = Math.min(containerW / vw, containerH / vh);
      const displayedW = vw * scale;
      const displayedH = vh * scale;
      const offsetX = (containerW - displayedW) / 2;
      const offsetY = (containerH - displayedH) / 2;
      canvas.style.left = `${offsetX}px`;
      canvas.style.top = `${offsetY}px`;
      canvas.style.width = `${displayedW}px`;
      canvas.style.height = `${displayedH}px`;
    }

    const ro = new ResizeObserver(recompute);
    ro.observe(video);
    video.addEventListener("loadedmetadata", recompute);
    recompute();
    return () => {
      ro.disconnect();
      video.removeEventListener("loadedmetadata", recompute);
    };
  }, [tech.id]);

  useEffect(() => {
    const loop = () => {
      tickRef.current++;
      const c = canvasRef.current;
      const v = videoRef.current;
      const timeline = timelineRef.current;
      animRef.current = requestAnimationFrame(loop);

      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const cssW = parseFloat(c.style.width) || c.offsetWidth;
      const cssH = parseFloat(c.style.height) || c.offsetHeight;
      const W = cssW * dpr, H = cssH * dpr;
      if (W && H && (c.width !== W || c.height !== H)) {
        c.width = W;
        c.height = H;
      }
      const ctx = c.getContext("2d");
      if (!W || !H) return;

      // X-Ray OFF: clear only, no overlay
      if (!xray) {
        ctx.clearRect(0, 0, W, H);
        return;
      }

      if (!v || !timeline || !timeline.entries) {
        ctx.clearRect(0, 0, W, H);
        return;
      }

      const t = v.currentTime;

      // Auto-advance the current phase based on video position
      const newIdx = computePhaseIdx(t, tech.phases);
      if (newIdx !== phIdxRef.current) {
        phIdxRef.current = newIdx;
        setPhIdx(newIdx);
      }

      const cur = tech.phases[newIdx];
      const duration = phaseDuration(tech.phases, newIdx);
      const progress = duration > 0
        ? Math.max(0, Math.min(1, (t - cur.t) / duration))
        : 0;

      const entry = nearestEntry(timeline.entries, t);
      if (!entry || !entry.pose) {
        ctx.clearRect(0, 0, W, H);
        return;
      }
      const dict = poseFromArray(entry.pose);
      const fallbackP = new Set(cur.p || []);
      const fallbackS = new Set(cur.sc || []);
      renderFilter(ctx, W, H, dict, fallbackP, fallbackS, xray, tickRef.current, cur.chain, progress);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [xray, tech]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = spd;
  }, [spd]);

  function pickPhase(i) {
    phIdxRef.current = i;
    setPhIdx(i);
    const p = tech.phases[i];
    if (!p) return;
    const v = videoRef.current;
    if (v) {
      try { v.currentTime = p.t; v.play(); } catch {}
    }
  }

  function vidPlay()    { try { videoRef.current?.play(); } catch {} }
  function vidPause()   { try { videoRef.current?.pause(); } catch {} }
  function vidRestart() { try { if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); } } catch {} }

  // UI-side derived sets — show the muscles that have fired so far at this progress
  const phaseDur = phaseDuration(tech.phases, phIdx);
  const liveProgress = (() => {
    const v = videoRef.current;
    if (!v || !phase) return 0;
    return Math.max(0, Math.min(1, (v.currentTime - phase.t) / phaseDur));
  })();
  const firingMuscles = phase?.chain
    ? phase.chain.filter(e => e.t <= liveProgress).map(e => ({ m: e.m, w: e.w }))
    : [
        ...(phase?.p || []).map(m => ({ m, w: "primary" })),
        ...(phase?.sc || []).map(m => ({ m, w: "secondary" })),
      ];

  return (
    <div className="min-h-screen bg-bg0 text-ink font-body">
      <div className="mx-auto w-full max-w-[430px] px-4 pt-4 pb-12">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-bg2 border border-white/10 text-xl leading-none flex items-center justify-center active:scale-95"
            aria-label="Back"
          >‹</button>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-semibold">{disc?.label}</div>
            <div className="font-display text-2xl leading-none">{tech.name}</div>
          </div>
        </div>

        <div className="relative aspect-video bg-bg2 rounded-xl overflow-hidden border border-white/5">
          {tech.videoSrc ? (
            <video
              ref={videoRef}
              src={tech.videoSrc}
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-contain bg-black"
              onLoadedMetadata={(e) => { e.currentTarget.playbackRate = spd; }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white/50">
              <div className="text-xl mb-1">▶</div>
              <div className="text-xs">No local video for this technique yet.</div>
              <div className="text-[10px] mt-1 text-white/30">videoId: {tech.videoId || "—"}</div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute pointer-events-none"
            style={{ top: 0, left: 0, width: 0, height: 0 }}
          />
          <button
            onClick={() => setXray(x => !x)}
            className={`absolute top-2 right-2 z-10 px-3 py-1.5 rounded-full text-[11px] font-bold backdrop-blur border ${
              xray
                ? "bg-cyber/20 text-cyber border-cyber/40"
                : "bg-black/40 text-white/70 border-white/10"
            }`}
          >
            🔬 {xray ? "X-Ray ON" : "X-Ray OFF"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">Speed</span>
          <input
            type="range" min="0.25" max="2" step="0.05" value={spd}
            onChange={e => setSpd(parseFloat(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-xs tabular-nums w-10 text-right text-white/70">{spd}×</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {[0.25, 0.5, 1, 1.5, 2].map(v => (
            <button
              key={v}
              onClick={() => setSpd(v)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold border ${
                Math.abs(spd - v) < 0.01
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "bg-bg2 border-white/5 text-white/60"
              }`}
            >
              {v === 0.25 ? "¼×" : v === 0.5 ? "½×" : v + "×"}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={vidPlay} className="flex-1 py-2 rounded-md bg-bg2 border border-white/5 text-sm active:scale-95">▶</button>
          <button onClick={vidPause} className="flex-1 py-2 rounded-md bg-bg2 border border-white/5 text-sm active:scale-95">⏸</button>
          <button onClick={vidRestart} className="flex-1 py-2 rounded-md bg-bg2 border border-white/5 text-sm active:scale-95">↺</button>
        </div>

        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold mb-2">
            Phase — tap to jump + morph
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
            {tech.phases.map((p, i) => (
              <button
                key={i}
                onClick={() => pickPhase(i)}
                className={`whitespace-nowrap snap-start px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  phIdx === i
                    ? "bg-accent text-bg0 border-accent"
                    : "bg-bg2 text-white/70 border-white/10"
                }`}
              >
                {p.n}
              </button>
            ))}
          </div>
        </div>

        {firingMuscles.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-accent mr-1">Firing</span>
            {firingMuscles.map(({ m, w }) => {
              const [r, g, b] = MC[m] || [255, 255, 255];
              const isSecondary = w === "secondary";
              return (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: `rgba(${r},${g},${b},${isSecondary ? 0.08 : 0.14})`,
                    color: `rgb(${r},${g},${b})`,
                    border: `1px solid rgba(${r},${g},${b},${isSecondary ? 0.20 : 0.35})`,
                    opacity: isSecondary ? 0.75 : 1,
                  }}
                >
                  {ML[m] || m}
                </span>
              );
            })}
          </div>
        )}

        {phase && (
          <div className="mt-4 space-y-2">
            <div className="font-display text-xl">{phase.n}</div>
            <div className="p-3 rounded-lg border" style={{ background: "rgba(6,214,160,0.05)", borderColor: "rgba(6,214,160,0.2)" }}>
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-green mb-1">✓ What to feel</div>
              <div className="text-sm" style={{ color: "rgba(180,255,220,0.85)" }}>{phase.feel}</div>
            </div>
            <div className="p-3 rounded-lg border" style={{ background: "rgba(255,82,82,0.05)", borderColor: "rgba(255,82,82,0.2)" }}>
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-danger mb-1">✗ Common mistake</div>
              <div className="text-sm" style={{ color: "rgba(255,180,180,0.85)" }}>{phase.err}</div>
            </div>
            <button
              onClick={() => onAskSensei?.(`I'm on "${phase.n}" in ${tech.name}. ${phase.feel} — explain the biomechanics.`)}
              className="w-full flex items-center gap-2 p-3 rounded-lg bg-bg2 border border-white/10 text-left text-sm active:scale-[0.99]"
            >
              <span className="text-base">⛩</span>
              <span>Ask Sensei about this phase</span>
              <span className="ml-auto opacity-50">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
