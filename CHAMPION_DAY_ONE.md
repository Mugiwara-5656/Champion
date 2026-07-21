# Champion — Day One Port Plan

> Hand this file to Claude Code on first run, alongside `champion_app.jsx` and `champion_marketing_kit.md`.

---

## TL;DR

- Port the artifact prototype (`champion_app.jsx`) into a real Vite + React project.
- Preserve the muscle filter renderer, pose data, technique library, and design tokens **verbatim** — those are the IP and they work.
- Replace the artifact-runtime API call with the official Anthropic SDK using your own API key.
- Get to "runs locally with no errors" before refactoring anything stylistically.
- Stop after each numbered task and verify. Do not power through.

---

## Project context

Champion is a mobile-first MMA training app. The differentiator is a live muscle X-ray filter that overlays on technique videos, showing exactly which muscles fire in each phase of every technique. An AI coach (Sensei) gives kinesthetic, no-fluff feedback and tracks the user's identified weaknesses across sessions.

**Business model:** free forever for the core experience; Champion Pro at $6/mo unlocks personal video upload + analysis. Coach tier at $18/mo for gym owners. All 10 MMA disciplines at launch.

**Builder:** solo, trains MMA, has gym connections for validation. Mobile-first PWA first, native wrap (Capacitor or Expo) only after PWA traction.

For launch strategy, viral reel storyboard, hashtag plan, and conversion funnel: see `champion_marketing_kit.md`.

---

## Prerequisites (Windows)

You have two valid paths. Read both, pick one, then commit.

### Option A — Native Windows (faster setup, fewer steps)

Anthropic officially supports native Windows for Claude Code as of 2025. Works in PowerShell with Git Bash under the hood.

1. **Install Git for Windows** — gitforwindows.org. Accept the defaults. This is required.
2. **Install Node.js 20 LTS** — nodejs.org, the LTS installer. Reboot if it asks.
3. **Open PowerShell** (not as Administrator), and install Claude Code:
   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```
4. **Restart PowerShell** — close it, reopen it.
5. **Verify:** `claude --version` should print a version number.
6. **Install GitHub CLI:** `winget install GitHub.cli`
7. **Sign into GitHub:** `gh auth login`
8. **VS Code** — code.visualstudio.com.

**Use Option A if:** you've never used Linux, you want to ship today, you don't plan to wrap to native iOS via Capacitor for a while.

### Option B — WSL2 + Ubuntu (more setup, smoother long-term)

WSL gives you a real Linux environment. Most Node tooling, Capacitor build chains, and AI-generated commands assume Unix. Worth the 15 extra minutes of setup if you're building anything beyond a weekend project.

1. **Open PowerShell as Administrator**, run:
   ```powershell
   wsl --install
   ```
   Reboot when prompted. Ubuntu installs by default.
2. When Ubuntu opens, set a username and password (separate from Windows).
3. **Install Node.js inside WSL:**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   nvm install 20
   nvm use 20
   node --version    # should print v20.x.x
   ```
4. **Install Git inside WSL:**
   ```bash
   sudo apt update && sudo apt install -y git gh
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
5. **Install Claude Code inside WSL:**
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude --version
   ```
6. **Install VS Code on Windows** (not in WSL — it bridges across):
   - code.visualstudio.com
   - Install the **WSL extension** from the Extensions panel.
   - From WSL terminal in your project folder: `code .` opens VS Code connected to WSL.
7. **Sign into GitHub:** `gh auth login`

**Use Option B if:** you've used a terminal before, you plan to wrap as native iOS/Android via Capacitor later, or you want fewer compatibility surprises down the road.

### My recommendation for you

You're solo, mobile-first, planning Capacitor later, and you've been navigating tech-heavy iteration with the artifact already. **Go with Option B (WSL2).** The 15 extra minutes up front saves hours of "why does this command not work on Windows" debugging across the next 6 months.

### Where to put your project

**If Option A (native):** anywhere on your C: drive. Suggested:
```powershell
mkdir C:\projects
cd C:\projects
```

**If Option B (WSL):** inside your Linux home directory, NOT under `/mnt/c/...`. File watching across the Windows/Linux boundary is dramatically slower and breaks Vite hot reload:
```bash
mkdir -p ~/projects
cd ~/projects
```

### Other accounts

- **Anthropic API key** — console.anthropic.com, add a payment method, generate a key. Free tier won't sustain dev volume; budget $5–10/mo for development.
- **Vercel account** — vercel.com, free tier is enough for launch. Connect your GitHub when prompted.

---

## Tech stack — locked in, do not debate

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Faster, simpler, the modern default. Not CRA. |
| Framework | **React 18** | Already what the prototype uses. |
| Language | **JavaScript** (not TypeScript) | Solo builder, vibe-coding speed > type safety. Add TS later if codebase grows past ~5k lines. |
| Styling | **Tailwind CSS** | Replaces the long CSS-in-JS string. Faster iteration. Map the artifact's `T` token object to `tailwind.config.js` theme extensions. |
| Routing | **React Router v6** | Real routes for PWA install + deep links. |
| API client | **`@anthropic-ai/sdk`** | Official SDK. Streaming support, cleaner than raw fetch. |
| YouTube | **`react-youtube`** | Replaces the brittle postMessage hack from the prototype. Real event callbacks for play/pause/seek. |
| State | **`useState` / `useReducer` / `useContext` only** | No Redux. No Zustand. Add later if and when needed. |
| PWA | **`vite-plugin-pwa`** | One config block, generates manifest + service worker. |
| Deploy | **Vercel** | Auto-deploy from GitHub, free tier fine, edge functions for the API proxy on Day 3. |

**Decisions explicitly deferred:**
- Native wrap (Capacitor vs Expo) — wait until PWA hits 100+ daily active users.
- User accounts / auth — localStorage fine until paid Pro tier launches.
- Database — same. Add Supabase or similar when subscriptions begin.
- Analytics — add Plausible or PostHog only after launch traffic justifies it.

---

## Folder structure (target)

```
champion/
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Filter/              # canvas overlay component + pose morphing
│   │   ├── Sensei/              # chat bubble, drill plan card
│   │   ├── Technique/           # video player, phase strip, muscle tags
│   │   └── shared/              # buttons, headers, etc
│   ├── data/
│   │   ├── tokens.js            # T (design tokens)
│   │   ├── poses.js             # KEYS, pose(), lerp(), P
│   │   ├── muscles.js           # MC, ML, SEG
│   │   └── techniques.js        # DISC, TECHS, ph() helper
│   ├── lib/
│   │   ├── anthropic.js         # SDK wrapper: askSensei, genDrillPlan
│   │   ├── filterRenderer.js    # renderFilter, caps — pixel-level filter pipeline
│   │   ├── storage.js           # LS get/set helpers
│   │   └── sanitize.js          # sanitizeHistory for API messages
│   ├── screens/
│   │   ├── Onboarding.jsx
│   │   ├── Home.jsx
│   │   ├── TechniqueDetail.jsx
│   │   ├── SenseiChat.jsx
│   │   ├── Profile.jsx
│   │   └── Diagnostics.jsx
│   ├── App.jsx                  # router shell
│   ├── main.jsx                 # entry
│   └── index.css                # Tailwind directives only
├── .env.local                   # ANTHROPIC_API_KEY — gitignored
├── .gitignore
├── CLAUDE.md                    # persistent repo context for Claude Code
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── index.html
```

---

## Day 1 tasks — execute in order, pause after each

### Task 1 — Bootstrap the project

```bash
npm create vite@latest champion -- --template react
cd champion
npm install
npm install @anthropic-ai/sdk react-router-dom react-youtube
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

**Verify:** `npm run dev` starts, the default Vite welcome page renders at `http://localhost:5173`.

### Task 2 — Configure Tailwind

In `tailwind.config.js`, extend the theme with the `T` token object from `champion_app.jsx`:

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg0: "#0a0a0d", bg1: "#131319", bg2: "#1c1c24", bg3: "#2a2a35",
        ink: "#f5f5f7",
        accent: "#ff3d00", accent2: "#ff8a3d",
        cyber: "#00d4ff",  // the X-ray cyan
        gold: "#ffd166", green: "#06d6a0", danger: "#ff5252",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        editorial: ["'Fraunces'", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

In `src/index.css`, replace contents with:
```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@1,400;1,600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Verify:** in `App.jsx` write `<h1 className="font-display text-accent text-4xl">CHAMPION</h1>` and confirm the orange display font renders.

### Task 3 — Environment + API key

Create `.env.local` (NOT committed):
```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

Update `.gitignore` to include `.env.local` and `.env*.local`.

Create `src/lib/anthropic.js`:
```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function askSensei(history, ctx, weaknesses) {
  const wkLine = weaknesses?.length ? `\nKnown weaknesses: ${weaknesses.join("; ")}.` : "";
  const ctxLine = ctx ? `\nCurrently studying: ${ctx}.` : "";
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are Sensei, an elite AI martial arts coach inside the Champion training app. Reply in max 3 sentences. Be specific, kinesthetic, tough. Reference muscles and joint mechanics. No filler.${ctxLine}${wkLine}\nIf you identify a new weakness, end with (WEAK: short label) on its own line.`,
    messages: history,
  });
  return response.content[0].text;
}

export async function genDrillPlan(weaknesses, discipline) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: "Return ONLY valid JSON. No preamble, no markdown fences.",
    messages: [{
      role: "user",
      content: `Generate a 7-day drill plan for ${discipline}. Weaknesses: ${weaknesses.length ? weaknesses.join(", ") : "general technique"}.

Shape: {"title":"...","days":[{"day":1,"focus":"...","drills":[{"name":"...","duration":"X min","cue":"key feel"}]}]}

7 days, 2-3 drills per day, cues reference specific muscles or joint mechanics.`,
    }],
  });
  const txt = response.content[0].text;
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  return JSON.parse(txt.slice(s, e + 1));
}
```

> **⚠ Security note on `dangerouslyAllowBrowser: true`:** this works for local dev but exposes your API key in any production bundle. Day 1 deploy should NOT include the API key in the Vercel environment. Day 3 task is to wrap this in a Vercel Edge Function so the key lives only on the server.

**Verify:** in browser devtools console, `import("./lib/anthropic.js").then(m => m.askSensei([{role:"user",content:"hi"}])).then(console.log)` returns a response.

### Task 4 — Port the data files (verbatim)

These come straight out of `champion_app.jsx`. Do not refactor, do not improve, just relocate:

| Source in `champion_app.jsx` | Target file | What to extract |
|---|---|---|
| `const T = {...}` | `src/data/tokens.js` | The full design token object — but Tailwind takes over for color classes; keep `T` available for inline styles where Tailwind classes don't fit (e.g., dynamic canvas colors). |
| `const KEYS`, `const pose`, `function lerp`, `const P` | `src/data/poses.js` | Joint name list, pose builder, interpolator, all 17 named poses. |
| `const MC`, `const ML`, `const SEG` | `src/data/muscles.js` | Muscle colors, labels, segment-to-joint mapping. |
| `const DISC`, `const ph`, `const TECHS` | `src/data/techniques.js` | The 10 disciplines and 15 technique definitions with phases. |
| `function caps`, `function renderFilter` | `src/lib/filterRenderer.js` | The canvas drawing pipeline. **Do not modify.** Working perfectly. |
| `function sanitizeHistory` | `src/lib/sanitize.js` | Message history validator for API calls. |
| `const LS = {get, set}` | `src/lib/storage.js` | localStorage wrappers with try/catch. |

Each file uses ES module exports. Example for `poses.js`:
```javascript
export const KEYS = ["head","lSh","rSh","lEl","rEl","lWr","rWr","lHip","rHip","lKnee","rKnee","lAnk","rAnk"];
export const pose = (...v) => { /* ... */ };
export function lerp(a, b, t) { /* ... */ }
export const P = { /* the 17 poses */ };
```

**Verify:** `import { TECHS } from "./data/techniques.js"; console.log(Object.keys(TECHS).length)` prints 10.

### Task 5 — Port the technique detail screen first

This is the screen with the muscle filter — the killer feature. Get it working end to end before touching anything else.

Build `src/screens/TechniqueDetail.jsx` with:
- `react-youtube` `<YouTube>` component for the video (replaces iframe + postMessage)
- A `<canvas>` positioned absolutely over the YouTube container with `pointerEvents: "none"`
- The pose morphing animation loop using `requestAnimationFrame` + `lerp` between phase poses
- Phase chip strip — tapping a chip seeks the YouTube player AND triggers pose morph
- X-ray toggle button
- Speed control (`react-youtube` has a `playerVars` for this and a `setPlaybackRate` method)
- Phase detail card with "what to feel" + "common mistake"
- "Ask Sensei about this phase" button (just navigation for now; wire up after Sensei screen exists)

`react-youtube` event API for reference:
```javascript
<YouTube
  videoId={tech.video}
  opts={{ playerVars: { autoplay: 1, modestbranding: 1, rel: 0 } }}
  onReady={(e) => { playerRef.current = e.target; }}
  onStateChange={(e) => { /* tracking */ }}
/>
// later: playerRef.current.seekTo(seconds, true);
//        playerRef.current.setPlaybackRate(0.5);
```

**Verify:** open `/technique/boxing/jab` — video plays, canvas shows muscle filter, all 4 phase chips morph the body, X-ray toggle works, speed control works.

### Task 6 — Port the remaining screens

Now that one screen end-to-end works, port the rest. One per file under `src/screens/`:

- `Home.jsx` — discipline grid, technique list, continue card, hero stats
- `Onboarding.jsx` — 3-step flow, gates app on first launch via localStorage flag
- `SenseiChat.jsx` — chat UI, drill plan card rendering, quick-question buttons
- `Profile.jsx` — streak, weakness list, settings rows
- `Diagnostics.jsx` — the 7 startup tests, displayed as colored pills

Use the existing JSX from `champion_app.jsx` as the template. Convert the inline styles and CSS class names to Tailwind classes as you go.

### Task 7 — Routing

`src/App.jsx`:
```javascript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LS } from "./lib/storage";
import Home from "./screens/Home";
import Onboarding from "./screens/Onboarding";
import TechniqueDetail from "./screens/TechniqueDetail";
import SenseiChat from "./screens/SenseiChat";
import Profile from "./screens/Profile";
import Diagnostics from "./screens/Diagnostics";

export default function App() {
  const [onboarded, setOnboarded] = useState(() => LS.get("champ_onboarded", false));
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Onboarding onDone={() => setOnboarded(true)} />} />
        <Route path="/" element={onboarded ? <Home /> : <Navigate to="/welcome" />} />
        <Route path="/technique/:disc/:id" element={<TechniqueDetail />} />
        <Route path="/sensei" element={<SenseiChat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/diagnostics" element={<Diagnostics />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Bottom nav becomes a shared component that uses `useNavigate` from React Router.

### Task 8 — PWA configuration

In `vite.config.js`:
```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Champion",
        short_name: "Champion",
        description: "Anyone can be Champion. MMA training with live muscle anatomy.",
        theme_color: "#ff3d00",
        background_color: "#0a0a0d",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
```

Generate icons (192×192 and 512×512) from the Champion logo. Place in `public/`.

### Task 9 — Create CLAUDE.md

This is the persistent context file Claude Code reads on every future session. Put it in repo root. Suggested skeleton:

```markdown
# Champion — repo context for Claude Code

## What this is
Mobile-first MMA training app. Live muscle X-ray filter on technique videos. AI coach (Sensei). Free forever core, $6/mo Pro for personal video analysis.

## Architecture
- Vite + React (JS, not TS) + Tailwind + React Router
- Single-page PWA, mobile-first (430px max width center column)
- Data is static (technique library, poses, muscle maps) — see `src/data/`
- Anthropic SDK for Sensei + drill plans — see `src/lib/anthropic.js`
- Filter renderer is a 2D canvas pipeline driven by interpolated poses — see `src/lib/filterRenderer.js`. Don't touch unless the user explicitly asks.

## Conventions
- Components: PascalCase files, default export
- Data: camelCase named exports
- Tailwind classes inline, no CSS modules
- localStorage keys all prefixed `champ_`

## Don't touch without asking
- `src/lib/filterRenderer.js` — the canvas pipeline. Working perfectly.
- `src/data/poses.js` — hand-tuned poses. Regeneration ruins technique fidelity.
- `src/data/techniques.js` — content is reviewed by martial artists. Structural changes only with explicit approval.

## Common tasks
- Add a new technique: edit `src/data/techniques.js`, add to the right discipline array
- Tune Sensei prompt: `src/lib/anthropic.js` system prompt
- Adjust filter visuals: `renderFilter` in `src/lib/filterRenderer.js`

## Known traps (don't recreate)
- API messages must start with role=user, alternate, end with user. `sanitizeHistory` enforces this. Use it on every API call.
- `dangerouslyAllowBrowser: true` is a dev-only crutch. Plan: route through Vercel Edge Function before public launch.
- YouTube postMessage is brittle. We use `react-youtube` instead.

## Source of truth docs
- `CHAMPION_DAY_ONE.md` — original port plan (historical reference)
- `champion_marketing_kit.md` — launch playbook, viral reel storyboard
```

### Task 10 — First commit + first deploy

If Option B (WSL): run all of this inside the **WSL Ubuntu terminal**, in `~/projects/champion/`.
If Option A (native): run inside **PowerShell** or **Git Bash**, in `C:\projects\champion\`.

```bash
git init
git add .
git commit -m "Day 1: port artifact prototype to Vite project"
gh repo create champion --private --source=. --push
```

If `gh` prompts for auth, follow the device-code flow.

Then connect to Vercel:
1. vercel.com/new → import the GitHub repo
2. **Do NOT** add `VITE_ANTHROPIC_API_KEY` to Vercel env vars yet — Sensei will be broken on the deployed version, that's intentional. Fix in Day 3 with the proxy.
3. Deploy.
4. On your phone: open the Vercel URL → tap Share → "Add to Home Screen" (iOS) or "Install app" (Android Chrome) → confirm icon and standalone app behavior.

**iOS install note:** PWA install on iOS only works in Safari (not Chrome on iOS). The "Add to Home Screen" option lives in the Share sheet. After install, the app launches from the home screen icon as standalone, not in a browser tab. This is the launch experience for iOS users until you wrap with Capacitor for App Store distribution.

---

## What to preserve verbatim — do not refactor on day 1

These are the IP. They were carefully built and work:

- **`renderFilter` function** — the canvas drawing pipeline. Tone-perfect.
- **Pose system** (`KEYS`, `P`, `lerp`, `pose`) — the choreographed body positions for every technique phase. Hand-tuned. Don't regenerate from scratch.
- **`SEG` map** — anatomical muscle-to-joint connections.
- **`TECHS` data** — the technique library content. The "what to feel" and "common mistake" cues are the product. Refining text is fine; structural changes need explicit approval.
- **Design tokens (`T`)** — color palette and spacing. Already iterated.

---

## Known traps — bugs from the prototype, don't recreate

1. **API message order**: must start with `role: user`, alternate roles strictly, last message must be `user`. Always run history through `sanitizeHistory` before calling the SDK.

2. **No assistant-first message in history.** Don't push a fake assistant message into chat state for display purposes — it poisons the next API call. Use a separate UI state (`infoBanner`, `toast`) for non-AI display content.

3. **Canvas DPR scaling.** Multiply `canvas.width = canvas.offsetWidth * devicePixelRatio` (and same for height) every frame, otherwise the filter blurs on retina displays.

4. **CSS template literal trap.** It's `${T.blue}` not `${T.blue)`. Cost a debugging session.

5. **Don't ship the API key to production.** `VITE_*` env vars get bundled. Day 3 task is the proxy; until then, deployed Sensei stays broken intentionally.

6. **YouTube `postMessage` is brittle.** `react-youtube` gives you proper play/pause/seek/setPlaybackRate methods. Use them.

### Windows-specific traps

7. **Don't put your project under `/mnt/c/...` if using WSL.** File watching crosses the Windows/Linux boundary and Vite hot reload becomes unusably slow. Keep the project in `~/projects/` inside WSL.

8. **Line endings.** Git on Windows can convert LF to CRLF on checkout, which breaks shell scripts and confuses some tools. Set this once globally:
   ```bash
   git config --global core.autocrlf input
   ```
   And add a `.gitattributes` file to your repo:
   ```
   * text=auto eol=lf
   ```

9. **PowerShell vs Bash command syntax.** Native Windows option uses Git Bash for shell tasks. If you see "command not found" errors for `curl`, `&&`, or `source`, you're in PowerShell instead of Git Bash. Open Git Bash directly (Start menu → Git Bash) for any commands that look Unix-flavored.

10. **`npm install -g` permissions.** On native Windows, never use `sudo` (doesn't exist) and never use Administrator PowerShell for npm — both cause permission cascades that break later installs. The default user PowerShell is correct.

11. **Antivirus false positives.** Some antivirus tools flag the Claude Code binary or Node.exe. If install fails silently, check Windows Security → Virus & threat protection → Protection history. Whitelist the Claude Code install directory.

---

## Validation: Day 1 is done when

- [ ] `npm run dev` boots cleanly with no warnings
- [ ] Onboarding flow (3 steps) gates first launch
- [ ] Home screen shows discipline grid, technique list, continue card
- [ ] Tapping a technique loads YouTube player
- [ ] Canvas overlay renders the muscle filter on top of the video
- [ ] Phase chips morph the body pose smoothly
- [ ] X-ray toggle works
- [ ] Speed control works (0.25× to 2×)
- [ ] Sensei chat sends a message locally and gets a real response from Claude
- [ ] Drill plan generator returns valid JSON and renders the 7-day plan
- [ ] Profile shows streak, tracked weaknesses
- [ ] Diagnostics screen runs all 7 tests, all pass
- [ ] PWA installs on your phone (Add to Home Screen → opens standalone with proper icon)
- [ ] Repo is on GitHub, deployed to Vercel (Sensei broken on deployed version is OK for Day 1)

---

## Day 2 and beyond — preview only, not for Day 1

**Day 2: MediaPipe Pose for Pro upload**
- `npm install @mediapipe/pose @mediapipe/camera_utils`
- Build video upload screen
- Run pose detection on uploaded video, drive the existing `renderFilter` with real-person landmarks
- This is the killer Pro feature: when users see the muscle filter follow their own body in their own footage, $6/mo becomes a no-brainer.

**Day 3: Vercel Edge Function for the API key**
- Create `api/sensei.js` and `api/drill-plan.js` Vercel functions
- Move `Anthropic` client server-side, key lives only in Vercel env vars
- Frontend calls `/api/sensei` instead of the SDK directly
- Drop `dangerouslyAllowBrowser: true`
- Add basic per-IP rate limiting

**Week 1: launch prep**
- Record the 6-second viral reel (storyboard in `champion_marketing_kit.md`)
- First gym validation: 3 fighters, 3 levels, capture reactions on camera
- Domain registration (champion.app or alternate)
- Final PWA polish — splash screens, install prompt timing

**Week 2–4: post-launch iteration**
- Watch day-3 retention (the only metric that matters)
- A/B test the 5 hook variants on TikTok and Reels
- First fighter signature pack — $20 one-time DLC

---

## Reference files to keep on hand

- `champion_app.jsx` — the artifact prototype, source of truth for data, renderer, and design.
- `champion_marketing_kit.md` — viral reel storyboard, captions, hashtag strategy, conversion funnel, gym validation playbook.

---

## How to start the conversation with Claude Code

On first run in your new `champion/` folder, point Claude Code at this file and say:

> "Read CHAMPION_DAY_ONE.md and champion_app.jsx. Confirm you understand the project, then start at Task 1. Pause after each numbered task — show me what you did and wait for me to say 'continue' before moving on."

That keeps you in control of the migration pace and stops Claude Code from steamrolling 10 tasks before you've verified the first one works.
