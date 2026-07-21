import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// Refined palette: warm charcoal + editorial whites + a single decisive accent
const T = {
  bg0:"#0a0a0d", bg1:"#131319", bg2:"#1c1c24", bg3:"#2a2a35",
  ink:"#f5f5f7", inkSub:"rgba(245,245,247,0.62)", inkMuted:"rgba(245,245,247,0.32)",
  border:"rgba(255,255,255,0.06)", borderHi:"rgba(255,255,255,0.14)",
  accent:"#ff3d00", accent2:"#ff8a3d",
  blue:"#00d4ff", gold:"#ffd166", green:"#06d6a0", red:"#ff5252",
};

// ─── MUSCLE COLORS ─────────────────────────────────────────────────────────────
const MC={glutes:[255,61,0],quads:[255,109,0],hams:[183,28,28],hipFx:[255,143,0],calves:[255,214,0],tibAnt:[174,234,0],hipAbd:[0,212,255],adductors:[124,77,255],obliques:[170,0,255],rectAb:[213,0,249],erectors:[98,0,234],pecs:[224,64,251],serratus:[234,128,252],delts:[255,64,129],biceps:[255,109,0],triceps:[255,215,64],lats:[0,229,255],traps:[29,233,182],forearms:[0,176,255]};
const ML={glutes:"Glutes",quads:"Quads",hams:"Hamstrings",hipFx:"Hip Flexors",calves:"Calves",tibAnt:"Tib. Ant.",hipAbd:"Hip Abd.",adductors:"Adductors",obliques:"Obliques",rectAb:"Rectus Ab.",erectors:"Erectors",pecs:"Pec Major",serratus:"Serratus",delts:"Deltoids",biceps:"Biceps",triceps:"Triceps",lats:"Lats",traps:"Traps",forearms:"Forearms"};

// ─── POSE ENGINE ───────────────────────────────────────────────────────────────
const KEYS=["head","lSh","rSh","lEl","rEl","lWr","rWr","lHip","rHip","lKnee","rKnee","lAnk","rAnk"];
const pose=(...v)=>{const o={};KEYS.forEach((k,i)=>{o[k]={x:v[i*2],y:v[i*2+1]};});return o;};
function lerp(a,b,t){const e=t<.5?2*t*t:-1+(4-2*t)*t;const o={};KEYS.forEach(k=>{o[k]={x:a[k].x+(b[k].x-a[k].x)*e,y:a[k].y+(b[k].y-a[k].y)*e};});return o;}

const P={
  guard:     pose(.50,.08,.42,.26,.58,.26,.37,.42,.63,.40,.37,.52,.62,.48,.45,.58,.55,.58,.43,.74,.55,.72,.43,.90,.57,.88),
  jab_ext:   pose(.50,.08,.39,.23,.61,.30,.26,.27,.66,.44,.12,.22,.63,.52,.45,.58,.55,.58,.43,.74,.55,.72,.43,.90,.57,.88),
  cross_hip: pose(.50,.08,.44,.28,.56,.24,.40,.44,.60,.36,.40,.54,.42,.28,.47,.58,.53,.56,.44,.74,.54,.70,.44,.90,.55,.86),
  cross_ext: pose(.50,.08,.45,.30,.55,.24,.41,.45,.52,.28,.41,.55,.26,.23,.47,.58,.53,.56,.44,.74,.54,.70,.44,.90,.55,.86),
  hook_load: pose(.50,.08,.40,.26,.60,.26,.34,.40,.64,.40,.34,.50,.62,.48,.45,.58,.55,.58,.42,.74,.54,.72,.42,.90,.56,.88),
  hook_snap: pose(.50,.08,.38,.24,.60,.28,.30,.36,.64,.42,.48,.30,.62,.50,.45,.58,.55,.58,.42,.74,.54,.72,.42,.90,.56,.88),
  mt_stance: pose(.50,.09,.44,.26,.56,.26,.40,.42,.60,.40,.40,.52,.58,.48,.47,.58,.55,.56,.45,.74,.55,.72,.45,.90,.58,.88),
  mt_chamber:pose(.50,.09,.44,.26,.56,.26,.40,.42,.60,.40,.40,.52,.58,.48,.48,.58,.56,.54,.46,.74,.68,.46,.46,.90,.72,.42),
  mt_hip:    pose(.50,.10,.44,.28,.56,.28,.33,.42,.74,.36,.29,.52,.78,.30,.48,.58,.52,.50,.46,.77,.78,.44,.46,.93,.84,.48),
  mt_impact: pose(.50,.10,.44,.28,.56,.28,.31,.40,.76,.34,.27,.50,.80,.28,.48,.58,.52,.48,.46,.78,.82,.46,.46,.94,.90,.52),
  dleg_lev:  pose(.50,.26,.44,.38,.56,.38,.40,.50,.60,.50,.42,.58,.58,.58,.46,.62,.54,.62,.44,.76,.56,.74,.44,.90,.56,.90),
  dleg_shot: pose(.42,.28,.38,.40,.54,.44,.34,.52,.60,.52,.36,.60,.62,.62,.42,.56,.56,.60,.36,.70,.58,.68,.34,.82,.58,.88),
  dleg_grip: pose(.44,.30,.40,.42,.56,.44,.44,.56,.54,.56,.50,.64,.50,.64,.44,.56,.56,.60,.38,.68,.58,.68,.36,.80,.58,.88),
  ab_guard:  pose(.50,.28,.40,.42,.60,.42,.35,.56,.65,.56,.42,.66,.58,.66,.46,.70,.54,.70,.38,.56,.62,.56,.36,.44,.64,.44),
  ab_bridge: pose(.50,.84,.40,.72,.60,.72,.32,.60,.68,.60,.28,.52,.72,.52,.44,.44,.56,.44,.36,.28,.64,.28,.38,.14,.62,.14),
  rnc_wrap:  pose(.50,.10,.42,.26,.58,.26,.36,.24,.64,.40,.44,.20,.62,.50,.46,.58,.54,.58,.44,.74,.56,.72,.44,.90,.56,.88),
  sprawl:    pose(.50,.30,.44,.44,.56,.44,.36,.58,.64,.58,.34,.68,.66,.68,.46,.56,.54,.56,.38,.38,.62,.38,.26,.26,.74,.26),
};

// ─── MUSCLE → SEGMENT MAP ──────────────────────────────────────────────────────
const SEG={
  pecs:[["lSh","head",.055],["rSh","head",.055]],
  traps:[["head","lSh",.040],["head","rSh",.040]],
  delts:[["lSh","lEl",.040],["rSh","rEl",.040]],
  lats:[["lSh","lHip",.046],["rSh","rHip",.046]],
  serratus:[["lSh","lHip",.030],["rSh","rHip",.030]],
  obliques:[["lSh","lHip",.042],["rSh","rHip",.042]],
  rectAb:[["lSh","rHip",.028],["rSh","lHip",.028]],
  erectors:[["lSh","lHip",.022],["rSh","rHip",.022]],
  biceps:[["lSh","lEl",.032],["rSh","rEl",.032]],
  triceps:[["lSh","lEl",.028],["rSh","rEl",.028]],
  forearms:[["lEl","lWr",.026],["rEl","rWr",.026]],
  glutes:[["lHip","lKnee",.058],["rHip","rKnee",.058]],
  hipFx:[["lHip","lKnee",.042],["rHip","rKnee",.042]],
  hipAbd:[["lHip","lKnee",.046],["rHip","rKnee",.046]],
  adductors:[["lHip","lKnee",.038],["rHip","rKnee",.038]],
  quads:[["lHip","lKnee",.052],["rHip","rKnee",.052]],
  hams:[["lHip","lKnee",.046],["rHip","rKnee",.046]],
  calves:[["lKnee","lAnk",.038],["rKnee","rAnk",.038]],
  tibAnt:[["lKnee","lAnk",.026],["rKnee","rAnk",.026]],
};

// ─── FILTER RENDERER ───────────────────────────────────────────────────────────
function caps(ctx,x1,y1,x2,y2,r){
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
  if(len<1)return;
  ctx.save();ctx.translate((x1+x2)/2,(y1+y2)/2);ctx.rotate(Math.atan2(dy,dx));
  ctx.beginPath();ctx.roundRect(-len/2,-r,len,r*2,r);ctx.fill();ctx.restore();
}

function renderFilter(ctx,W,H,j,active,sec,xray,tick){
  ctx.clearRect(0,0,W,H);
  const px=k=>j[k].x*W, py=k=>j[k].y*H;
  const pulse=.55+.45*Math.sin(tick*.08);

  const sA=xray?.09:.50, sR=xray?20:48, sG=xray?40:62, sB=xray?92:88;
  const segs=[["lSh","rSh",.048],["lHip","rHip",.044],["lSh","lEl",.038],["rSh","rEl",.038],["lEl","lWr",.030],["rEl","rWr",.030],["lSh","lHip",.065],["rSh","rHip",.065],["lHip","lKnee",.054],["rHip","rKnee",.054],["lKnee","lAnk",.038],["rKnee","rAnk",.038]];
  segs.forEach(([j1,j2,rf])=>{ctx.fillStyle=`rgba(${sR},${sG},${sB},${sA})`;caps(ctx,px(j1),py(j1),px(j2),py(j2),rf*H);});
  ctx.fillStyle=`rgba(${sR},${sG},${sB},${sA})`;
  ctx.beginPath();ctx.ellipse(px("head"),py("head"),.062*W,.072*H,0,0,Math.PI*2);ctx.fill();

  const skA=xray?.50:.18;
  ctx.strokeStyle=`rgba(0,212,255,${skA})`;ctx.lineWidth=xray?1.5:.8;ctx.setLineDash([4,3]);
  [["head","lSh"],["head","rSh"],["lSh","rSh"],["lSh","lEl"],["lEl","lWr"],["rSh","rEl"],["rEl","rWr"],["lSh","lHip"],["rSh","rHip"],["lHip","rHip"],["lHip","lKnee"],["lKnee","lAnk"],["rHip","rKnee"],["rKnee","rAnk"]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(px(a),py(a));ctx.lineTo(px(b),py(b));ctx.stroke();});
  ctx.setLineDash([]);

  KEYS.forEach(k=>{
    const r=k==="head"?.018*W:.010*W;
    ctx.save();ctx.shadowColor="rgba(0,212,255,.9)";ctx.shadowBlur=xray?14:5;
    ctx.fillStyle=xray?"rgba(0,212,255,.9)":"rgba(0,212,255,.55)";
    ctx.beginPath();ctx.arc(px(k),py(k),r,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });

  Object.entries(SEG).forEach(([key,segs2])=>{
    const isAct=active.has(key), isSec=sec.has(key);
    if(!isAct&&!isSec)return;
    const [r,g,b]=MC[key]||[255,255,255];
    const alpha=isAct?(xray?.60+.28*pulse:.42+.18*pulse):(xray?.28:.16);
    const glow=isAct?(xray?14+8*pulse:8+4*pulse):(xray?4:2);
    segs2.forEach(([j1,j2,rf])=>{
      const x1=px(j1),y1=py(j1),x2=px(j2),y2=py(j2);
      const len=Math.hypot(x2-x1,y2-y1),ang=Math.atan2(y2-y1,x2-x1),mr=rf*H*.80;
      ctx.save();
      ctx.shadowColor=`rgba(${r},${g},${b},.95)`;ctx.shadowBlur=glow;
      ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
      ctx.strokeStyle=`rgba(${r},${g},${b},${Math.min(alpha*2.2,1)})`;
      ctx.lineWidth=isAct?1.2:.6;
      ctx.translate((x1+x2)/2,(y1+y2)/2);ctx.rotate(ang);
      ctx.beginPath();ctx.roundRect(-len*.44,-mr,len*.88,mr*2,mr);
      ctx.fill();ctx.stroke();
      ctx.restore();
    });
    if(isAct&&xray){
      const s=segs2[0];if(!s)return;
      const lx=(px(s[0])+px(s[1]))/2,ly=(py(s[0])+py(s[1]))/2-.03*H;
      ctx.save();
      ctx.font=`bold ${Math.round(.026*H)}px Inter,system-ui`;
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.shadowColor=`rgba(${r},${g},${b},.9)`;ctx.shadowBlur=8;
      ctx.fillStyle=`rgba(${r},${g},${b},.95)`;
      ctx.fillText(ML[key]||key,lx,ly);
      ctx.restore();
    }
  });

  if(xray){ctx.fillStyle="rgba(0,0,30,.025)";for(let y=0;y<H;y+=5)ctx.fillRect(0,y,W,2);}
}

// ─── DATA ──────────────────────────────────────────────────────────────────────
const DISC=[
  {id:"boxing",label:"Boxing",icon:"🥊",color:"#ff3d00"},
  {id:"muaythai",label:"Muay Thai",icon:"🦵",color:"#ff8a3d"},
  {id:"kicks",label:"Kicks",icon:"⚡",color:"#ffd166"},
  {id:"wrestling",label:"Wrestling",icon:"🤼",color:"#00d4ff"},
  {id:"bjj",label:"BJJ",icon:"♟",color:"#7c4dff"},
  {id:"clinch",label:"Clinch",icon:"🔗",color:"#06d6a0"},
  {id:"arms",label:"Arm Locks",icon:"💪",color:"#8b5cf6"},
  {id:"chokes",label:"Chokes",icon:"🩸",color:"#e040fb"},
  {id:"legs",label:"Leg Locks",icon:"🦿",color:"#aa00ff"},
  {id:"defense",label:"Defense",icon:"🛡",color:"#00b0ff"},
];

const ph=(t,n,po,p,sc,feel,err)=>({t,n,pose:po,p,sc,feel,err});
const TECHS={
  boxing:[
    {id:"jab",name:"Jab",diff:1,video:"5yCaM3oFpLA",phases:[
      ph(0,"Guard","guard",["calves","hipAbd"],["quads","erectors"],"Weight on balls of feet. Rear heel up — spring loaded.","Flat rear heel kills hip rotation before the cross even starts."),
      ph(8,"Push & Rotate","guard",["calves","obliques","pecs"],["delts","triceps"],"Lead oblique snaps. Shoulder rises to shield chin.","Arm-only jab loses 60% of force. Body drives the punch."),
      ph(18,"Extension","jab_ext",["pecs","delts","triceps","serratus"],["obliques","traps"],"Serratus protracts the scapula at the last inch — that's reach.","Stopping short loses reach and the serratus contribution."),
      ph(28,"Snap Back","guard",["biceps","traps"],["obliques"],"Return AS fast as it extended. A slow jab is an arm to grab.","Slow retraction leaves the arm out as a target."),
    ]},
    {id:"cross",name:"Cross",diff:1,video:"E03oBhSDzbc",phases:[
      ph(0,"Loaded","guard",["calves","hipAbd"],["quads"],"Rear heel up. Hip coiled. Everything pre-loaded.","Flat rear foot — the cross cannot rotate the hip."),
      ph(8,"Hip First","cross_hip",["calves","quads","glutes","obliques"],["erectors","hipFx"],"Floor → calf → quad → glute → obliques. Hip FIRST.","Arm before hip — the most common power leak in boxing."),
      ph(22,"Delivery","cross_ext",["pecs","delts","triceps","serratus"],["lats","traps","forearms"],"Arm extends AFTER hip rotates. Palm faces down.","Over-rotating drops guard and exposes chin."),
      ph(34,"Recover","guard",["biceps","traps"],["obliques"],"Snap back, both hands return simultaneously.","Admiring the punch invites a counter."),
    ]},
    {id:"hook",name:"Lead Hook",diff:2,video:"cMWOHFLJSuY",phases:[
      ph(0,"Pivot","hook_load",["calves","obliques"],["hipAbd","quads"],"Lead foot pivots out. Hip snaps. Arm stays at 90°.","Swinging only the arm — slow and telegraphed."),
      ph(10,"Hip Snap","hook_snap",["obliques","glutes","quads"],["erectors"],"Hip snap generates all power. Elbow leads, not the fist.","Elbow below 90° turns a hook into a swing."),
      ph(20,"Impact","guard",["pecs","delts","biceps"],["traps","forearms"],"Fist clenches ONLY at contact. Relax before.","Clenched through the swing bleeds all power."),
    ]},
  ],
  muaythai:[
    {id:"mt_round",name:"Roundhouse",diff:2,video:"wwc4cnvkwnk",phases:[
      ph(0,"Stance","mt_stance",["calves","quads"],["hipAbd","erectors"],"Both heels up. Knees soft. A coiled spring.","Flat feet — you cannot pivot. Every Muay Thai kick dies here."),
      ph(10,"Step","mt_stance",["calves","glutes","hipFx"],["obliques","quads"],"Lead foot steps 45°. Kicking hip pre-loads.","Skipping the step — worse balance, less power."),
      ph(20,"Pivot","mt_chamber",["calves","tibAnt","hipAbd"],["erectors"],"Support heel turns to face target. Hip fully opens.","Half-pivot limits rotation. 90° minimum."),
      ph(30,"Hip Drive","mt_hip",["glutes","obliques","erectors"],["hipFx","hipAbd"],"Opposite arm swings BACK — boosts rotation.","Keeping arm up blocks full hip rotation."),
      ph(40,"Impact","mt_impact",["quads","hams","calves"],["glutes","obliques"],"Lower 1/3 tibia. Leg loose — rigid ONLY at impact.","Kicking with the foot — less force, ankle injury risk."),
      ph(50,"Recover","mt_stance",["hams","hipFx"],["calves","hipAbd"],"Active hamstring pull. Land on ball of foot.","Dropping the leg — off balance, can be caught."),
    ]},
    {id:"teep",name:"Teep",diff:1,video:"wwc4cnvkwnk",phases:[
      ph(0,"Chamber","mt_chamber",["hipFx","rectAb"],["calves","quads"],"Knee up to waist height. Foot cocked like a piston.","Low chamber becomes a push. No range control."),
      ph(12,"Thrust","mt_hip",["quads","glutes","calves"],["erectors"],"Hip shoots FORWARD. Heel leads.","Only extending leg without hip — power halved."),
      ph(22,"Recover","mt_stance",["hams","hipFx"],["calves"],"Pull back same way it fired. Land on ball of foot.","Dropping the leg — off balance."),
    ]},
  ],
  kicks:[
    {id:"sidekick",name:"Side Kick",diff:2,video:"Y-UXlcgjKSE",phases:[
      ph(0,"Chamber","mt_chamber",["hipFx","quads"],["calves","hipAbd"],"Knee chambers sideways — hip flexes AND abducts.","Chambering forward destroys the side angle."),
      ph(12,"Thrust","mt_hip",["quads","glutes","hipAbd"],["erectors","calves"],"Hip shoots out. HEEL leads.","Pushing with ball of foot — less impact, ankle risk."),
      ph(22,"Recover","mt_stance",["hams","hipFx"],["adductors"],"Chamber back before setting down.","Dropping foot straight down — no follow-up."),
    ]},
  ],
  wrestling:[
    {id:"dleg",name:"Double Leg",diff:2,video:"Fl4RkzHvSLg",phases:[
      ph(0,"Set-Up","guard",["quads","calves"],["hipAbd","erectors"],"Hands up, head moving. Wait for the reactive window.","Shooting blind — they're sprawling before you arrive."),
      ph(8,"Level Change","dleg_lev",["quads","glutes","calves"],["erectors","hipFx"],"Drop from KNEES. Back flat. Eyes FORWARD.","Bending at waist — telegraphed, slow, destroys posture."),
      ph(16,"Penetration","dleg_shot",["quads","glutes","calves"],["erectors","obliques"],"Lead knee to floor. Head OUTSIDE their hip.","Head center = guillotine setup."),
      ph(26,"Lock Grip","dleg_grip",["lats","biceps","forearms"],["pecs","delts"],"Arms lock BEHIND the knees.","Grabbing AT knees — they push your head down."),
      ph(36,"Drive","dleg_lev",["glutes","quads","calves","lats"],["erectors","obliques"],"Legs churn like a sprint. 3 full steps minimum.","Stopping at first contact — gives them the sprawl."),
    ]},
  ],
  bjj:[
    {id:"armbar",name:"Armbar",diff:2,video:"BsP3PO57uxc",phases:[
      ph(0,"Break Posture","ab_guard",["rectAb","hipFx"],["adductors","erectors"],"Guard legs pull DOWN. Both hands grip wrist — THUMB UP.","Thumb down rotates elbow wrong. Lock fails."),
      ph(10,"Swing Legs","ab_guard",["hipFx","adductors","obliques"],["rectAb","quads"],"Fast committed swing to perpendicular.","Slow swing — they posture up and angle is lost."),
      ph(20,"Pinch Knees","ab_guard",["adductors","quads"],["hipFx","hams"],"Inner thighs CLAMP above bicep. Zero gap.","Any gap = #1 armbar escape."),
      ph(30,"Hip Bridge","ab_bridge",["glutes","hams"],["erectors","adductors"],"Drive hips UP like a max hip thrust.","Pulling arm with arm strength — wrong direction."),
    ]},
    {id:"rnc",name:"Rear Naked Choke",diff:2,video:"4xmC1MipMD4",phases:[
      ph(0,"Back Control","guard",["adductors","calves"],["glutes","erectors"],"Hooks inside thighs. Chest to their back.","Hooks outside — they rotate into you."),
      ph(10,"Blade Under","rnc_wrap",["pecs","lats","biceps"],["forearms","delts"],"BLADE of forearm on carotid — slide deep.","Crook on throat = air choke. Outlast."),
      ph(22,"Figure Four","rnc_wrap",["biceps","pecs","lats"],["forearms","delts"],"Free hand grips BICEP of choking arm.","Hand behind head — loses leverage."),
      ph(32,"Squeeze","rnc_wrap",["pecs","lats","biceps","forearms"],["glutes","erectors"],"Whole body: pec, lat, back arch.","Arms-only squeeze tires fast."),
    ]},
  ],
  clinch:[{id:"plum",name:"Thai Clinch",diff:2,video:"wwc4cnvkwnk",phases:[
    ph(0,"Enter","guard",["delts","traps","biceps"],["erectors"],"Both hands behind head. Fingers interlaced.","Crossing hands — they peel apart."),
    ph(12,"Cave Elbows","rnc_wrap",["lats","traps","biceps"],["obliques"],"Elbows cave IN. Posture broken.","Elbows flaring — they posture up."),
    ph(22,"Knee","mt_chamber",["hipFx","quads","calves"],["rectAb","glutes"],"Drive knee from hip. Pull them onto it.","Letting them step back — knee misses."),
  ]}],
  arms:[{id:"kimura",name:"Kimura",diff:2,video:"mGrauiHNT-g",phases:[
    ph(0,"Figure Four","guard",["pecs","delts","biceps"],["forearms"],"Hand on wrist, other arm grips your wrist.","Wrong grip direction — no leverage."),
    ph(12,"Isolate","guard",["lats","biceps","pecs"],["obliques"],"Pin elbow to chest. Their arm is your lever.","Elbow drifts — they recover."),
    ph(22,"Rotate","hook_snap",["delts","pecs","lats"],["biceps","traps"],"Rotate hand toward back. Small motion = huge pressure.","Forcing with speed — needs leverage."),
  ]}],
  chokes:[{id:"guillotine",name:"Guillotine",diff:2,video:"4xmC1MipMD4",phases:[
    ph(0,"Wrap","rnc_wrap",["pecs","biceps","forearms"],["delts","traps"],"Arm wraps neck. Crook on carotid.","Wrapping the throat — air choke."),
    ph(12,"Drive","rnc_wrap",["lats","pecs","biceps"],["obliques","erectors"],"Free hand grips wrist. Hips drive forward.","Posture breaks — they pull head out."),
    ph(22,"Finish","rnc_wrap",["lats","pecs","biceps","forearms"],["glutes","quads"],"Hips forward, arms pull neck up.","Pulling down — wrong direction."),
  ]}],
  legs:[{id:"heelhook",name:"Inside Heel Hook",diff:3,video:"mGrauiHNT-g",phases:[
    ph(0,"Entangle","ab_guard",["adductors","hams"],["calves","quads"],"Knee inside their leg. Control first.","Going for heel without position."),
    ph(12,"Seat & Grip","ab_guard",["glutes","adductors"],["hams","quads"],"Sit to hip. Both hands on heel.","Gap between bodies — they roll out."),
    ph(24,"Rotate","ab_bridge",["lats","biceps","pecs"],["forearms","delts"],"Rotate heel MEDIALLY. Knee rotates.","Pulling straight — that's an ankle lock."),
  ]}],
  defense:[
    {id:"sprawl",name:"Sprawl",diff:2,video:"rXbF1aJfhGo",phases:[
      ph(0,"Read Shot","guard",["calves","quads"],["erectors","hipAbd"],"See the level change BEFORE they reach you.","Waiting until they have your legs — too late."),
      ph(8,"Hip Drop","sprawl",["glutes","erectors","quads"],["calves","hams"],"Hips drop, full weight pins shoulders.","Hips too high — they pick a leg."),
      ph(18,"Control","sprawl",["lats","pecs","traps"],["obliques","forearms"],"Chest-to-back. Head to mat.","No upper body control — they scramble up."),
    ]},
    {id:"slip",name:"Slip",diff:1,video:"5yCaM3oFpLA",phases:[
      ph(0,"Read","guard",["calves","quads"],["erectors"],"Watch shoulder load. Slip JUST before.","Moving too early — they adjust."),
      ph(10,"Rotate","hook_load",["obliques","erectors"],["calves","hipAbd"],"Head off centerline via body rotation.","Leaning only the neck — vulnerable."),
      ph(18,"Counter","jab_ext",["obliques","quads","calves"],["pecs","delts"],"Counter from the slipped position.","No counter — slip is just retreat."),
    ]},
  ],
};

// ─── SENSEI AI ─────────────────────────────────────────────────────────────────
// Debug log — last attempt details for the UI to read
const DBG={last:null};

function sanitizeHistory(history){
  const cleaned=[];
  for(const m of history||[]){
    if(!m||!m.content||typeof m.content!=="string")continue;
    const txt=m.content.trim();if(!txt)continue;
    const role=m.role==="assistant"?"assistant":"user";
    if(cleaned.length===0&&role!=="user")continue;
    if(cleaned.length>0&&cleaned[cleaned.length-1].role===role){
      cleaned[cleaned.length-1].content+="\n\n"+txt;
    }else{
      cleaned.push({role,content:txt});
    }
  }
  if(cleaned.length===0)cleaned.push({role:"user",content:"Hello"});
  if(cleaned[cleaned.length-1].role!=="user")cleaned.pop();
  return cleaned;
}

async function callAnthropic(body){
  const dbg={t0:Date.now(),bodySize:JSON.stringify(body).length};
  let r;
  try{
    r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    dbg.fetchOk=true;dbg.status=r.status;dbg.statusText=r.statusText;
  }catch(e){
    dbg.fetchOk=false;dbg.errName=e.name;dbg.errMsg=e.message;dbg.errStack=(e.stack||"").split("\n")[0];
    DBG.last=dbg;
    throw new Error(`fetch threw: ${e.name||"Error"}: ${e.message}`);
  }
  let text="";
  try{text=await r.text();dbg.bodyLen=text.length;dbg.bodyPreview=text.slice(0,200);}
  catch(e){dbg.textErr=e.message;}
  let data=null;try{data=JSON.parse(text);}catch(e){dbg.parseErr=e.message;}
  DBG.last=dbg;
  if(!r.ok){
    const detail=data?.error?.message||data?.message||text.slice(0,140)||`HTTP ${r.status}`;
    throw new Error(detail);
  }
  if(data?.error)throw new Error(data.error.message||"API error");
  if(!data)throw new Error(`bad JSON: ${text.slice(0,80)}`);
  return data;
}

// Bare-bones spec example — for debug button. Bypasses ALL my code.
async function bareApiTest(){
  const dbg={t0:Date.now()};
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:"Say hi"}]}),
    });
    dbg.status=r.status;dbg.ok=r.ok;
    const t=await r.text();dbg.body=t.slice(0,200);
    return dbg;
  }catch(e){
    dbg.threw=true;dbg.errName=e.name;dbg.errMsg=e.message;
    return dbg;
  }
}

async function askSensei(history,ctx,weaknesses){
  const msgs=sanitizeHistory(history);
  if(!msgs.length||msgs[0].role!=="user")throw new Error("Type a message to start.");
  // Embed coaching instructions into first user message (system field unreliable in artifact runtime)
  const wk=weaknesses?.length?` Tracked weaknesses: ${weaknesses.join("; ")}.`:"";
  const cx=ctx?` Currently studying: ${ctx}.`:"";
  const preamble=`[You are Sensei, an elite AI martial arts coach inside the Champion training app. Reply in max 3 sentences. Be specific, kinesthetic, tough. Reference muscles and joint mechanics. No filler.${cx}${wk} If you identify a new weakness, add (WEAK: short label) at the very end.]\n\n`;
  const apiMsgs=msgs.map((m,i)=>i===0?{role:"user",content:preamble+m.content}:m);
  const data=await callAnthropic({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:apiMsgs});
  return data.content?.[0]?.text||"Try again.";
}

async function genDrillPlan(weaknesses,discipline){
  const userMsg=`[Return ONLY valid JSON. No preamble, no markdown fences, no other text.]

Generate a personalized 7-day drill plan for an athlete training: ${discipline}. Weaknesses: ${weaknesses.length?weaknesses.join(", "):"general technique"}.

Use this exact JSON shape:
{"title":"Plan name","days":[{"day":1,"focus":"...","drills":[{"name":"...","duration":"X min","cue":"key feel"}]}]}

7 days. 2-3 drills per day. Drill cues should reference specific muscles or joint mechanics.`;
  const data=await callAnthropic({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:userMsg}]});
  let txt=data.content?.[0]?.text||"";
  const s=txt.indexOf("{"),e=txt.lastIndexOf("}");
  if(s<0||e<0)throw new Error("Invalid JSON returned");
  return JSON.parse(txt.slice(s,e+1));
}

// ─── DIAGNOSTICS — ACTUAL TESTS ────────────────────────────────────────────────
const TESTS={
  api:async()=>{
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:5,messages:[{role:"user",content:"hi"}]})});
      return{ok:r.ok,detail:r.ok?"connected":`HTTP ${r.status}`};
    }catch(e){return{ok:false,detail:e.message};}
  },
  canvas:()=>{
    try{const c=document.createElement("canvas");c.width=10;c.height=10;const ctx=c.getContext("2d");if(!ctx)return{ok:false,detail:"no 2d context"};ctx.fillStyle="red";ctx.fillRect(0,0,10,10);const px=ctx.getImageData(5,5,1,1).data;return{ok:px[0]>200,detail:`pixel ${px[0]},${px[1]},${px[2]}`};}catch(e){return{ok:false,detail:e.message};}
  },
  storage:()=>{
    try{const k="__champ_test__";localStorage.setItem(k,"1");const v=localStorage.getItem(k);localStorage.removeItem(k);return{ok:v==="1",detail:"localStorage available"};}catch(e){return{ok:false,detail:e.message};}
  },
  poseData:()=>{
    const errs=[];
    Object.entries(P).forEach(([n,p])=>{KEYS.forEach(k=>{if(!p[k]||typeof p[k].x!=="number"||typeof p[k].y!=="number")errs.push(`${n}.${k}`);});});
    return{ok:errs.length===0,detail:errs.length===0?`${Object.keys(P).length} poses valid`:`missing ${errs.length}`};
  },
  techCount:()=>{
    let total=0;Object.values(TECHS).forEach(arr=>total+=arr.length);
    return{ok:total>=10,detail:`${total} techniques across ${Object.keys(TECHS).length} disciplines`};
  },
  viewport:()=>{
    const w=window.innerWidth,h=window.innerHeight;
    return{ok:w>=320&&h>=480,detail:`${w}×${h} ${w<=480?"mobile":"desktop"}`};
  },
  rAF:()=>{
    return{ok:typeof requestAnimationFrame==="function",detail:"animation loop available"};
  },
};

async function runAllTests(){
  const out={};
  for(const [k,fn] of Object.entries(TESTS)){
    try{out[k]=await fn();}catch(e){out[k]={ok:false,detail:`crash: ${e.message}`};}
  }
  return out;
}

// ─── LOCAL STORAGE HELPERS ─────────────────────────────────────────────────────
const LS={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
};

// ─── CSS ───────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@1,400;1,600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{color-scheme:dark}
html,body{background:${T.bg0};color:${T.ink};font-family:'Inter',sans-serif;height:100%;-webkit-tap-highlight-color:transparent;overscroll-behavior:none;-webkit-font-smoothing:antialiased}
.app{display:flex;flex-direction:column;height:100vh;max-width:430px;margin:0 auto;background:${T.bg0};overflow:hidden}
.safe{height:env(safe-area-inset-top,0);background:${T.bg0};flex-shrink:0}
button{font-family:inherit}
/* Header */
.hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 18px 8px;flex-shrink:0;border-bottom:1px solid transparent}
.logo{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:${T.ink}}
.logo em{color:${T.accent};font-style:normal;font-weight:900}
.hdr-act{display:flex;gap:8px;align-items:center}
.icon-btn{width:34px;height:34px;border-radius:9px;border:1px solid ${T.border};background:${T.bg1};display:flex;align-items:center;justify-content:center;cursor:pointer;color:${T.ink};font-size:14px;transition:all .14s}
.icon-btn:hover{border-color:${T.borderHi};background:${T.bg2}}
.scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;overflow-x:hidden}
.scroll::-webkit-scrollbar{display:none}

/* Editorial home */
.hero{padding:32px 24px 20px;text-align:left;border-bottom:1px solid ${T.border}}
.hero-eyebrow{font-size:10px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${T.accent};margin-bottom:14px;display:flex;align-items:center;gap:8px}
.hero-eyebrow::before{content:"";width:18px;height:1px;background:${T.accent}}
.hero-title{font-family:'Barlow Condensed',sans-serif;font-size:48px;font-weight:900;line-height:.92;letter-spacing:-.01em;text-transform:uppercase;color:${T.ink};margin-bottom:14px}
.hero-title em{font-family:'Fraunces',serif;font-weight:600;font-style:italic;color:${T.accent};text-transform:none;letter-spacing:0;font-size:.92em}
.hero-sub{font-size:14px;line-height:1.6;color:${T.inkSub};max-width:340px;font-weight:400}
.hero-stats{display:flex;gap:18px;margin-top:18px;padding-top:18px;border-top:1px solid ${T.border}}
.stat{flex:1}
.stat-n{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:${T.ink};line-height:1}
.stat-l{font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${T.inkMuted};margin-top:4px}

/* Continue card */
.cont-card{margin:18px 18px 6px;padding:16px;border-radius:12px;background:linear-gradient(135deg,rgba(255,61,0,.10),rgba(255,138,61,.04));border:1px solid rgba(255,61,0,.22);cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .14s}
.cont-card:active{transform:scale(.99)}
.cont-icon{width:40px;height:40px;border-radius:10px;background:${T.accent};color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 4px 14px rgba(255,61,0,.3)}
.cont-meta{flex:1;min-width:0}
.cont-l{font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${T.accent};margin-bottom:2px}
.cont-n{font-family:'Fraunces',serif;font-size:16px;font-weight:600;font-style:italic;color:${T.ink};line-height:1.2}
.cont-arrow{color:${T.inkSub};font-size:18px}

/* Section heading */
.sec{padding:22px 18px 8px;display:flex;align-items:flex-end;justify-content:space-between}
.sec-l{font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:${T.inkMuted}}
.sec-c{font-size:11px;font-weight:600;color:${T.accent};cursor:pointer}

/* Discipline grid 2-col */
.disc-grid{padding:0 18px 8px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dcell{padding:14px 14px 12px;border-radius:11px;border:1px solid ${T.border};background:${T.bg1};cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
.dcell:active{transform:scale(.98)}
.dcell.active{border-color:transparent;background:linear-gradient(135deg,${T.bg2},${T.bg3})}
.dcell-icon{font-size:22px;line-height:1;margin-bottom:8px}
.dcell-name{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${T.ink}}
.dcell-count{font-size:9px;font-weight:600;color:${T.inkMuted};letter-spacing:.1em;margin-top:2px}
.dcell-bar{position:absolute;bottom:0;left:0;height:2px;width:0;transition:width .25s}
.dcell.active .dcell-bar{width:100%}

/* Tech list */
.tlist{padding:8px 18px 8px;display:flex;flex-direction:column;gap:8px}
.tcard{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:11px;border:1px solid ${T.border};background:${T.bg1};cursor:pointer;transition:all .14s}
.tcard:active{transform:scale(.99)}
.tcard:hover{border-color:${T.borderHi}}
.tdot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.tinfo{flex:1;min-width:0}
.tname{font-family:'Fraunces',serif;font-size:15px;font-weight:600;font-style:italic;color:${T.ink};line-height:1.2}
.tmeta{font-size:10px;color:${T.inkMuted};margin-top:3px;display:flex;align-items:center;gap:8px;font-weight:500}
.tlevel{display:inline-flex;gap:2px}
.tlevel span{width:5px;height:5px;border-radius:1px}
.tarrow{color:${T.inkMuted};font-size:18px}

/* Detail */
.back-row{display:flex;align-items:center;gap:12px;padding:12px 18px 6px;flex-shrink:0}
.bb{width:34px;height:34px;border-radius:9px;border:1px solid ${T.border};background:${T.bg1};display:flex;align-items:center;justify-content:center;cursor:pointer;color:${T.ink};font-size:18px;flex-shrink:0}
.bb:active{transform:scale(.94)}
.b-disc{font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:${T.inkMuted}}
.b-name{font-family:'Fraunces',serif;font-size:22px;font-weight:600;font-style:italic;color:${T.ink};line-height:1.1}

/* Video + filter */
.vid-wrap{position:relative;background:#000;aspect-ratio:16/9;flex-shrink:0;overflow:hidden}
.vid-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:none;z-index:1}
.vid-wrap canvas{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none}
.vid-ph{position:absolute;inset:0;z-index:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:${T.bg1}}
.xtoggle{position:absolute;top:10px;right:10px;z-index:3;padding:6px 11px;border-radius:6px;border:1px solid;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .14s;backdrop-filter:blur(10px);font-family:'Inter',sans-serif}
.xt-off{background:rgba(0,0,0,.6);border-color:rgba(0,212,255,.3);color:rgba(0,212,255,.8)}
.xt-on{background:rgba(0,30,60,.75);border-color:${T.blue};color:${T.blue};box-shadow:0 0 14px rgba(0,212,255,.35)}

/* Speed */
.ctrl{padding:9px 18px;background:${T.bg1};border-bottom:1px solid ${T.border};display:flex;align-items:center;gap:9px;flex-shrink:0}
.ctrl-l{font-size:9px;font-weight:600;letter-spacing:.14em;color:${T.inkMuted};text-transform:uppercase;white-space:nowrap}
input[type=range]{flex:1;height:3px;-webkit-appearance:none;background:rgba(255,255,255,.1);border-radius:2px;outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:${T.accent};cursor:pointer;box-shadow:0 0 8px rgba(255,61,0,.5)}
.spd-v{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;color:${T.accent};min-width:30px}
.sps{display:flex;gap:3px}
.sp{padding:4px 8px;border-radius:4px;font-size:10px;font-weight:600;border:1px solid ${T.border};background:transparent;color:${T.inkMuted};cursor:pointer;transition:all .12s;font-family:'Inter',sans-serif}
.sp.on{background:rgba(255,61,0,.15);border-color:rgba(255,61,0,.4);color:${T.accent}}
.pb-row{display:flex;gap:6px;padding:8px 18px;flex-shrink:0}
.pb{flex:1;padding:8px;border-radius:7px;border:1px solid ${T.border};background:${T.bg1};color:${T.inkSub};font-size:13px;font-weight:600;cursor:pointer;text-align:center;transition:all .12s;font-family:'Inter',sans-serif}
.pb:active{transform:scale(.96)}

/* Phase strip */
.ph-wrap{padding:8px 18px 4px;flex-shrink:0}
.ph-l{font-size:9px;font-weight:600;letter-spacing:.16em;color:${T.inkMuted};text-transform:uppercase;margin-bottom:6px}
.ph-strip{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.ph-strip::-webkit-scrollbar{display:none}
.phb{flex-shrink:0;padding:7px 13px;border-radius:7px;border:1px solid ${T.border};background:${T.bg1};color:${T.inkSub};font-size:11px;font-weight:600;cursor:pointer;letter-spacing:.04em;white-space:nowrap;transition:all .12s;font-family:'Inter',sans-serif}
.phb:active{transform:scale(.96)}
.phb.on{background:rgba(255,61,0,.14);border-color:rgba(255,61,0,.5);color:${T.accent}}

.mtags{padding:6px 18px 8px;display:flex;flex-wrap:wrap;gap:4px;flex-shrink:0}
.mtag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:11px;font-size:10px;font-weight:600;letter-spacing:.02em}

/* Detail cards */
.dcards{padding:8px 18px 12px;display:flex;flex-direction:column;gap:8px}
.ph-title{font-family:'Fraunces',serif;font-size:18px;font-weight:600;font-style:italic;color:${T.ink}}
.dcard{border-radius:9px;padding:11px 13px;border:1px solid;font-size:13px;line-height:1.6}
.dcard-l{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px}
.ask-btn{display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:9px;border:1px solid rgba(0,212,255,.25);background:rgba(0,212,255,.05);color:${T.blue};font-size:12px;font-weight:600;cursor:pointer;width:100%;transition:all .13s;font-family:'Inter',sans-serif}
.ask-btn:hover{background:rgba(0,212,255,.1)}

/* Sensei */
.sensei-screen{flex:1;display:flex;flex-direction:column;overflow:hidden}
.sensei-hdr{padding:14px 18px 10px;flex-shrink:0;border-bottom:1px solid ${T.border};display:flex;align-items:center;gap:12px}
.sensei-av{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,rgba(0,212,255,.15),rgba(0,212,255,.04));border:1px solid rgba(0,212,255,.25);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.sensei-title{font-family:'Fraunces',serif;font-size:22px;font-weight:600;font-style:italic;color:${T.ink};line-height:1}
.sensei-sub{font-size:11px;color:${T.inkMuted};margin-top:3px;font-weight:500}
.sensei-tools{display:flex;gap:6px;padding:10px 18px;flex-shrink:0;border-bottom:1px solid ${T.border};overflow-x:auto;scrollbar-width:none}
.sensei-tools::-webkit-scrollbar{display:none}
.tool-btn{flex-shrink:0;padding:7px 12px;border-radius:6px;border:1px solid ${T.border};background:${T.bg1};color:${T.inkSub};font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;transition:all .12s}
.tool-btn:hover{border-color:${T.borderHi};color:${T.ink}}
.msgs{flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px;scrollbar-width:none}
.msgs::-webkit-scrollbar{display:none}
.msg{max-width:88%;padding:11px 14px;font-size:13px;line-height:1.6;word-break:break-word}
.msg.ai{background:${T.bg2};border:1px solid ${T.border};border-radius:4px 12px 12px 12px;align-self:flex-start}
.msg.user{background:rgba(255,61,0,.12);border:1px solid rgba(255,61,0,.25);border-radius:12px 4px 12px 12px;align-self:flex-end}
.msg-from{font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:4px}
.msg.ai .msg-from{color:${T.blue}}
.msg.user .msg-from{color:${T.accent}}
.qbs{padding:0 18px 10px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}
.qb{padding:8px 11px;border-radius:7px;border:1px solid ${T.border};background:${T.bg1};color:${T.inkSub};font-size:11px;font-weight:500;cursor:pointer;line-height:1.3;text-align:left;transition:all .12s;font-family:'Inter',sans-serif}
.qb:hover{color:${T.ink};border-color:${T.borderHi}}
.chat-bar{display:flex;gap:8px;padding:11px 18px;border-top:1px solid ${T.border};background:${T.bg0};flex-shrink:0;padding-bottom:max(11px,env(safe-area-inset-bottom))}
.chat-in{flex:1;background:${T.bg1};border:1.5px solid ${T.border};border-radius:9px;color:${T.ink};padding:10px 13px;font-size:13px;outline:none;font-family:'Inter',sans-serif}
.chat-in:focus{border-color:rgba(255,61,0,.4)}
.chat-in::placeholder{color:${T.inkMuted}}
.send-btn{padding:10px 18px;background:${T.accent};border:none;border-radius:9px;color:#fff;font-size:14px;font-weight:700;cursor:pointer}
.send-btn:disabled{opacity:.4;cursor:not-allowed}

/* Drill plan */
.drill-day{margin-bottom:10px;padding:12px 14px;border-radius:9px;border:1px solid ${T.border};background:${T.bg1}}
.drill-d-hdr{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.drill-d-num{width:24px;height:24px;border-radius:6px;background:rgba(255,61,0,.15);color:${T.accent};display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:13px}
.drill-d-focus{font-family:'Fraunces',serif;font-size:14px;font-weight:600;font-style:italic;color:${T.ink}}
.drill-row{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.drill-row:last-child{border-bottom:none}
.drill-name{flex:1;font-size:12px;color:${T.ink};font-weight:500}
.drill-dur{font-size:10px;color:${T.accent};font-weight:600;letter-spacing:.06em}
.drill-cue{font-size:11px;color:${T.inkSub};line-height:1.5;margin-top:3px;font-style:italic}

/* Profile */
.prof-hero{padding:24px 18px 18px;text-align:center;border-bottom:1px solid ${T.border}}
.prof-av{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,${T.accent},${T.accent2});display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:10px;box-shadow:0 8px 24px rgba(255,61,0,.3)}
.prof-name{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;letter-spacing:.04em;color:${T.ink};text-transform:uppercase}
.prof-meta{font-size:11px;color:${T.inkMuted};margin-top:3px;letter-spacing:.04em}
.prof-stats{display:flex;justify-content:center;gap:24px;margin-top:14px;padding-top:14px;border-top:1px solid ${T.border}}
.psn{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:${T.ink};line-height:1}
.psl{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${T.inkMuted};margin-top:3px}
.row{padding:13px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid ${T.border};cursor:pointer;transition:background .12s}
.row:hover{background:${T.bg1}}
.row-i{width:32px;height:32px;border-radius:8px;background:${T.bg2};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.row-l{flex:1;font-size:13px;color:${T.ink};font-weight:500}
.row-v{font-size:11px;color:${T.inkMuted};font-weight:500}

/* Diagnostics */
.diag-pill{padding:11px 14px;border-radius:9px;border:1px solid ${T.border};background:${T.bg1};margin-bottom:6px;display:flex;align-items:center;gap:11px}
.diag-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.diag-name{flex:1;font-size:13px;color:${T.ink};font-weight:500}
.diag-detail{font-size:11px;color:${T.inkMuted};font-family:'Inter',sans-serif;font-weight:500}

/* Onboarding */
.onb{flex:1;display:flex;flex-direction:column;padding:32px 24px 20px;overflow-y:auto}
.onb-eye{font-size:10px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${T.accent};margin-bottom:12px}
.onb-title{font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:900;line-height:.95;letter-spacing:-.01em;text-transform:uppercase;color:${T.ink};margin-bottom:8px}
.onb-title em{font-family:'Fraunces',serif;font-weight:600;font-style:italic;color:${T.accent};text-transform:none;letter-spacing:0}
.onb-sub{font-size:14px;line-height:1.55;color:${T.inkSub};margin-bottom:24px;font-weight:400}
.onb-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}
.onb-cell{padding:18px 14px;border-radius:11px;border:1px solid ${T.border};background:${T.bg1};cursor:pointer;text-align:left;transition:all .14s}
.onb-cell:hover,.onb-cell.sel{border-color:rgba(255,61,0,.4);background:rgba(255,61,0,.05)}
.onb-cell-ic{font-size:22px;margin-bottom:8px;line-height:1}
.onb-cell-n{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${T.ink};margin-bottom:2px}
.onb-cell-d{font-size:10px;color:${T.inkMuted};line-height:1.4}
.onb-cta{margin-top:auto;padding:13px;background:${T.accent};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.04em;font-family:'Inter',sans-serif;transition:all .14s}
.onb-cta:disabled{opacity:.3;cursor:not-allowed}
.onb-skip{margin-top:8px;background:transparent;color:${T.inkMuted};border:none;font-size:11px;cursor:pointer;letter-spacing:.06em;text-decoration:underline;font-family:'Inter',sans-serif}
.onb-progress{display:flex;gap:4px;margin-bottom:16px}
.onb-prog-d{height:3px;flex:1;border-radius:2px;background:${T.bg2}}
.onb-prog-d.on{background:${T.accent}}

/* Bottom nav */
.bnav{flex-shrink:0;display:flex;background:${T.bg1};border-top:1px solid ${T.border};padding-bottom:env(safe-area-inset-bottom,0)}
.ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0 8px;cursor:pointer;border:none;background:transparent}
.ni-ic{font-size:18px;line-height:1;filter:grayscale(1);opacity:.32;transition:all .14s}
.ni-lb{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${T.inkMuted};transition:all .14s}
.ni.on .ni-ic{filter:none;opacity:1;transform:scale(1.05)}
.ni.on .ni-lb{color:${T.ink}}
.spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.1);border-top-color:${T.accent};border-radius:50%;animation:sp .7s linear infinite;vertical-align:middle}
@keyframes sp{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 16px;border-radius:8px;background:${T.bg2};border:1px solid ${T.borderHi};color:${T.ink};font-size:12px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,.4);font-weight:500}
`;

const QQS=[
  "Why doesn't my roundhouse have power?",
  "How do I stop telegraphing my jab?",
  "How do I improve hip rotation speed?",
  "What drills fix a weak double leg?",
];

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function App(){
  const [boot,setBoot]=useState(()=>!LS.get("champ_onboarded",false));
  const [onbStep,setOnbStep]=useState(0);
  const [onbDisc,setOnbDisc]=useState(null);
  const [onbLevel,setOnbLevel]=useState(null);

  const [nav,setNav]=useState("train");
  const [discId,setDiscId]=useState(()=>LS.get("champ_disc","boxing"));
  const [tech,setTech]=useState(null);
  const [phIdx,setPhIdx]=useState(0);
  const [xray,setXray]=useState(false);
  const [spd,setSpd]=useState(1);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [aiLoad,setAiLoad]=useState(false);
  const [aiErr,setAiErr]=useState("");
  const [apiDebug,setApiDebug]=useState(null);
  const [weaknesses,setWeaknesses]=useState(()=>LS.get("champ_weak",[]));
  const [drillPlan,setDrillPlan]=useState(()=>LS.get("champ_plan",null));
  const [planLoad,setPlanLoad]=useState(false);
  const [diag,setDiag]=useState(null);
  const [diagRunning,setDiagRunning]=useState(false);
  const [recent,setRecent]=useState(()=>LS.get("champ_recent",null));
  const [streak,setStreak]=useState(()=>LS.get("champ_streak",0));
  const [toast,setToast]=useState("");

  const poseRef=useRef(P.guard);
  const targetRef=useRef(P.guard);
  const lerpRef=useRef(1);
  const tickRef=useRef(0);
  const canvasRef=useRef(null);
  const animRef=useRef(null);
  const iframeRef=useRef(null);
  const endRef=useRef(null);

  const disc=DISC.find(d=>d.id===discId);
  const discTechs=TECHS[discId]||[];
  const phase=tech?.phases?.[phIdx];
  const pSet=new Set(phase?.p||[]);
  const sSet=new Set(phase?.sc||[]);

  // Save on changes
  useEffect(()=>{LS.set("champ_disc",discId);},[discId]);
  useEffect(()=>{LS.set("champ_weak",weaknesses);},[weaknesses]);
  useEffect(()=>{if(drillPlan)LS.set("champ_plan",drillPlan);},[drillPlan]);

  // Animation
  useEffect(()=>{
    const loop=()=>{
      tickRef.current++;
      if(lerpRef.current<1){
        lerpRef.current=Math.min(1,lerpRef.current+.04);
        poseRef.current=lerp(poseRef.current,targetRef.current,lerpRef.current);
      }
      const c=canvasRef.current;
      if(c){
        const dpr=window.devicePixelRatio||1;
        const W=c.offsetWidth*dpr,H=c.offsetHeight*dpr;
        if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
        renderFilter(c.getContext("2d"),W,H,poseRef.current,pSet,sSet,xray,tickRef.current);
      }
      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(animRef.current);
  },[phIdx,xray,tech]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(""),2400);}

  function pickTech(t){
    setTech(t);setPhIdx(0);
    const fp=P[t.phases[0]?.pose]||P.guard;
    poseRef.current=fp;targetRef.current=fp;lerpRef.current=1;
    const r={discId,techId:t.id,name:t.name,disc:disc?.label};
    setRecent(r);LS.set("champ_recent",r);
    // Bump streak (simple: any tech load = +1, capped)
    const last=LS.get("champ_streak_date","");
    const today=new Date().toDateString();
    if(last!==today){
      const newStreak=streak+1;
      setStreak(newStreak);
      LS.set("champ_streak",newStreak);
      LS.set("champ_streak_date",today);
    }
  }
  function pickPhase(i){
    setPhIdx(i);
    const p=tech?.phases?.[i];
    if(!p)return;
    targetRef.current=P[p.pose]||P.guard;lerpRef.current=0;
    try{iframeRef.current?.contentWindow?.postMessage(JSON.stringify({event:"command",func:"seekTo",args:[p.t,true]}),"*");}catch(e){}
  }
  function ytCmd(fn,args=[]){try{iframeRef.current?.contentWindow?.postMessage(JSON.stringify({event:"command",func:fn,args}),"*");}catch(e){}}

  async function sendMsg(text){
    const q=(text||input).trim();
    if(!q||aiLoad)return;
    setInput("");setAiErr("");
    const nm=[...msgs,{role:"user",content:q}];
    setMsgs(nm);setAiLoad(true);
    try{
      const ctx=tech?`Studying: ${disc?.label} → ${tech.name}. Phase: ${phase?.n||"none"}.${phase?` Cue: "${phase.feel}"`:""}`:null;
      const reply=await askSensei(nm,ctx,weaknesses);
      // Extract weakness if present
      const wkMatch=reply.match(/\(WEAK:\s*([^)]+)\)/i);
      let cleaned=reply;
      if(wkMatch){
        const newWk=wkMatch[1].trim();
        cleaned=reply.replace(/\(WEAK:[^)]+\)/i,"").trim();
        if(!weaknesses.includes(newWk)&&weaknesses.length<8){
          setWeaknesses(w=>[...w,newWk]);
          showToast(`📝 Added: ${newWk}`);
        }
      }
      setMsgs(m=>[...m,{role:"assistant",content:cleaned}]);
    }catch(e){setAiErr(`Failed: ${e.message}`);}
    setAiLoad(false);
  }

  async function makePlan(){
    if(planLoad)return;
    setPlanLoad(true);
    try{
      const plan=await genDrillPlan(weaknesses,disc?.label||"MMA");
      setDrillPlan(plan);
      showToast("✓ Drill plan ready");
    }catch(e){setAiErr(`Plan failed: ${e.message}`);}
    setPlanLoad(false);
  }

  async function runDiag(){
    setDiagRunning(true);
    const r=await runAllTests();
    setDiag(r);
    setDiagRunning(false);
  }

  function finishOnb(){
    if(onbDisc)setDiscId(onbDisc);
    LS.set("champ_onboarded",true);
    LS.set("champ_level",onbLevel);
    setBoot(false);
  }

  const vidSrc=tech?`https://www.youtube.com/embed/${tech.video}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`:null;
  const totalTechs=Object.values(TECHS).reduce((s,a)=>s+a.length,0);

  // ─── ONBOARDING ─────────────────────────────────────────────────────────────
  if(boot){
    return(<>
      <style>{CSS}</style>
      <div className="app">
        <div className="safe"/>
        <div className="hdr"><div className="logo"><em>CHAMPION</em></div></div>
        <div className="onb">
          <div className="onb-progress">{[0,1,2].map(i=><div key={i} className={`onb-prog-d${i<=onbStep?" on":""}`}/>)}</div>
          {onbStep===0&&(<>
            <div className="onb-eye">Welcome</div>
            <h1 className="onb-title">Anyone<br/>can be<br/><em>Champion</em></h1>
            <p className="onb-sub">Real video. Live muscle anatomy. AI coach in your pocket. Train anywhere, anytime — for free.</p>
            <button className="onb-cta" onClick={()=>setOnbStep(1)}>Start Training</button>
            <button className="onb-skip" onClick={finishOnb}>Skip onboarding</button>
          </>)}
          {onbStep===1&&(<>
            <div className="onb-eye">Step 1 of 2</div>
            <h1 className="onb-title">What's<br/>your art?</h1>
            <p className="onb-sub">Pick where you train most. You can change this anytime.</p>
            <div className="onb-grid">
              {DISC.slice(0,6).map(d=>(
                <button key={d.id} className={`onb-cell${onbDisc===d.id?" sel":""}`} onClick={()=>setOnbDisc(d.id)}>
                  <div className="onb-cell-ic">{d.icon}</div>
                  <div className="onb-cell-n">{d.label}</div>
                  <div className="onb-cell-d">{TECHS[d.id]?.length||0} techniques</div>
                </button>
              ))}
            </div>
            <button className="onb-cta" disabled={!onbDisc} onClick={()=>setOnbStep(2)}>Continue</button>
          </>)}
          {onbStep===2&&(<>
            <div className="onb-eye">Step 2 of 2</div>
            <h1 className="onb-title">Where are<br/>you in your<br/><em>journey?</em></h1>
            <p className="onb-sub">This helps Sensei calibrate advice to your level.</p>
            <div className="onb-grid" style={{gridTemplateColumns:"1fr"}}>
              {[
                ["beginner","🌱","Beginner","First 6 months. Building fundamentals."],
                ["intermediate","🔥","Intermediate","1–3 years. Sharpening technique."],
                ["advanced","⚡","Advanced","3+ years. Refining at the margins."],
              ].map(([id,ic,n,d])=>(
                <button key={id} className={`onb-cell${onbLevel===id?" sel":""}`} onClick={()=>setOnbLevel(id)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px"}}>
                  <div style={{fontSize:22,lineHeight:1}}>{ic}</div>
                  <div>
                    <div className="onb-cell-n" style={{marginBottom:2}}>{n}</div>
                    <div className="onb-cell-d">{d}</div>
                  </div>
                </button>
              ))}
            </div>
            <button className="onb-cta" disabled={!onbLevel} onClick={finishOnb}>Enter Champion</button>
          </>)}
        </div>
      </div>
    </>);
  }

  // ─── MAIN APP ───────────────────────────────────────────────────────────────
  return(<>
    <style>{CSS}</style>
    <div className="app">
      <div className="safe"/>
      <div className="hdr">
        <div className="logo"><em>CHAMPION</em></div>
        <div className="hdr-act">
          <button className="icon-btn" onClick={()=>setNav("profile")}>👤</button>
        </div>
      </div>

      {/* SENSEI */}
      {nav==="sensei"&&(
        <div className="sensei-screen">
          <div className="sensei-hdr">
            <div className="sensei-av">⛩</div>
            <div>
              <div className="sensei-title">Sensei</div>
              <div className="sensei-sub">{tech?`${disc?.label} · ${tech.name}`:"Your AI martial arts coach"}</div>
            </div>
          </div>
          <div className="sensei-tools">
            <button className="tool-btn" onClick={makePlan} disabled={planLoad}>{planLoad?"Generating…":"📋 Drill Plan"}</button>
            {weaknesses.length>0&&<button className="tool-btn" onClick={()=>showToast(`Tracking: ${weaknesses.join("; ")}`)}>🎯 {weaknesses.length} weakness{weaknesses.length>1?"es":""}</button>}
            <button className="tool-btn" onClick={async()=>{const r=await bareApiTest();setApiDebug(r);}}>🧪 Test API</button>
            <button className="tool-btn" onClick={()=>{setMsgs([]);setDrillPlan(null);setApiDebug(null);}}>↻ Reset</button>
          </div>
          {msgs.length===0&&!drillPlan&&<div className="qbs">{QQS.map(q=><button key={q} className="qb" onClick={()=>sendMsg(q)}>{q}</button>)}</div>}
          <div className="msgs">
            {msgs.length===0&&!drillPlan&&<div style={{textAlign:"center",padding:"32px 0",color:T.inkMuted,fontSize:13,lineHeight:1.7}}><div style={{fontSize:30,marginBottom:10,opacity:.3}}>⛩</div>Ask anything.<br/>Sensei remembers your weaknesses across sessions.</div>}
            {drillPlan&&(
              <div style={{padding:"4px 0"}}>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:600,fontStyle:"italic",color:T.ink,marginBottom:10}}>{drillPlan.title}</div>
                {drillPlan.days?.map(day=>(
                  <div key={day.day} className="drill-day">
                    <div className="drill-d-hdr">
                      <div className="drill-d-num">{day.day}</div>
                      <div className="drill-d-focus">{day.focus}</div>
                    </div>
                    {day.drills?.map((d,i)=>(
                      <div key={i} className="drill-row" style={{flexDirection:"column",alignItems:"flex-start"}}>
                        <div style={{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"baseline"}}>
                          <div className="drill-name">{d.name}</div>
                          <div className="drill-dur">{d.duration}</div>
                        </div>
                        {d.cue&&<div className="drill-cue">{d.cue}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {msgs.map((m,i)=>(
              <div key={i} className={`msg ${m.role==="assistant"?"ai":"user"}`}>
                <div className="msg-from">{m.role==="assistant"?"Sensei":"You"}</div>
                {m.content}
              </div>
            ))}
            {aiLoad&&<div className="msg ai"><div className="msg-from">Sensei</div><span className="spin"/> <span style={{fontSize:11,color:T.inkMuted,marginLeft:6}}>coaching…</span></div>}
            {aiErr&&<div style={{padding:"10px 13px",borderRadius:8,background:"rgba(255,82,82,.08)",border:"1px solid rgba(255,82,82,.3)",fontSize:12,color:T.red}}>⚠ {aiErr}</div>}
            {apiDebug&&(
              <div style={{padding:"12px 14px",borderRadius:8,background:"rgba(0,212,255,.06)",border:"1px solid rgba(0,212,255,.25)",fontSize:11,color:T.ink,fontFamily:"ui-monospace, monospace",lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                <div style={{fontWeight:700,letterSpacing:".1em",color:T.blue,marginBottom:6,fontFamily:"'Inter',sans-serif"}}>🧪 BARE API TEST RESULT</div>
                {apiDebug.threw?(
                  <>fetch threw an exception:{"\n"}name: {apiDebug.errName||"(unknown)"}{"\n"}msg: {apiDebug.errMsg||"(empty)"}</>
                ):(
                  <>HTTP {apiDebug.status} ({apiDebug.ok?"OK":"FAIL"}){"\n"}body: {apiDebug.body||"(empty)"}</>
                )}
                {DBG.last&&(
                  <>{"\n\n"}LAST SENSEI CALL:{"\n"}fetchOk: {String(DBG.last.fetchOk)}{"\n"}{DBG.last.errMsg?`err: ${DBG.last.errName}: ${DBG.last.errMsg}`:`status: ${DBG.last.status}, bodyLen: ${DBG.last.bodyLen||0}`}</>
                )}
              </div>
            )}
            <div ref={endRef}/>
          </div>
          <div className="chat-bar">
            <input className="chat-in" placeholder="Ask Sensei anything…" value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}/>
            <button className="send-btn" disabled={aiLoad||!input.trim()} onClick={()=>sendMsg()}>↑</button>
          </div>
        </div>
      )}

      {nav!=="sensei"&&(
        <div className="scroll">
          {/* HOME */}
          {nav==="train"&&!tech&&(<>
            <div className="hero">
              <div className="hero-eyebrow">All 10 Disciplines · Free Forever</div>
              <h1 className="hero-title">Anyone can be<br/><em>Champion</em></h1>
              <p className="hero-sub">Real video with a live muscle filter. AI coach in your pocket. Train anywhere, anytime.</p>
              <div className="hero-stats">
                <div className="stat"><div className="stat-n">{totalTechs}</div><div className="stat-l">Techniques</div></div>
                <div className="stat"><div className="stat-n">{Object.keys(TECHS).length}</div><div className="stat-l">Disciplines</div></div>
                <div className="stat"><div className="stat-n">{streak}</div><div className="stat-l">Day Streak</div></div>
              </div>
            </div>

            {recent&&TECHS[recent.discId]?.find(t=>t.id===recent.techId)&&(
              <div className="cont-card" onClick={()=>{setDiscId(recent.discId);pickTech(TECHS[recent.discId].find(t=>t.id===recent.techId));}}>
                <div className="cont-icon">▶</div>
                <div className="cont-meta">
                  <div className="cont-l">Continue training</div>
                  <div className="cont-n">{recent.name}</div>
                </div>
                <div className="cont-arrow">›</div>
              </div>
            )}

            <div className="sec"><div className="sec-l">Choose your art</div></div>
            <div className="disc-grid">
              {DISC.map(d=>(
                <div key={d.id} className={`dcell${discId===d.id?" active":""}`} onClick={()=>setDiscId(d.id)}>
                  <div className="dcell-icon">{d.icon}</div>
                  <div className="dcell-name">{d.label}</div>
                  <div className="dcell-count">{TECHS[d.id]?.length||0} techniques</div>
                  <div className="dcell-bar" style={{background:d.color}}/>
                </div>
              ))}
            </div>

            <div className="sec"><div className="sec-l">{disc?.label} library</div><div className="sec-c">{discTechs.length} total</div></div>
            <div className="tlist">
              {discTechs.length===0&&<div style={{padding:"24px 18px",fontSize:12,color:T.inkMuted,textAlign:"center",lineHeight:1.7,border:`1px dashed ${T.border}`,borderRadius:10}}>Coming Season 2.</div>}
              {discTechs.map(t=>(
                <div key={t.id} className="tcard" onClick={()=>pickTech(t)}>
                  <div className="tdot" style={{background:disc?.color,boxShadow:`0 0 8px ${disc?.color}`}}/>
                  <div className="tinfo">
                    <div className="tname">{t.name}</div>
                    <div className="tmeta">
                      <span className="tlevel">{[1,2,3].map(i=><span key={i} style={{background:i<=t.diff?(t.diff===1?T.green:t.diff===2?T.gold:T.red):"rgba(255,255,255,.1)"}}/>)}</span>
                      {t.diff===1?"Beginner":t.diff===2?"Intermediate":"Advanced"} · {t.phases.length} phases
                    </div>
                  </div>
                  <div className="tarrow">›</div>
                </div>
              ))}
            </div>
            <div style={{height:24}}/>
          </>)}

          {/* TECHNIQUE DETAIL */}
          {nav==="train"&&tech&&(<>
            <div className="back-row">
              <button className="bb" onClick={()=>{setTech(null);setPhIdx(0);}}>‹</button>
              <div>
                <div className="b-disc">{disc?.label}</div>
                <div className="b-name">{tech.name}</div>
              </div>
            </div>
            <div className="vid-wrap">
              <div className="vid-ph">
                <div style={{fontSize:22,opacity:.15}}>▶</div>
                <div style={{fontSize:11,color:T.inkMuted,textAlign:"center",lineHeight:1.5}}>YouTube loads in deployed app<br/>Filter overlay active — pick a phase</div>
              </div>
              <iframe ref={iframeRef} key={tech.video} src={vidSrc} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>
              <canvas ref={canvasRef}/>
              <button className={`xtoggle ${xray?"xt-on":"xt-off"}`} onClick={()=>setXray(x=>!x)}>🔬 {xray?"X-Ray ON":"X-Ray OFF"}</button>
            </div>
            <div className="ctrl">
              <span className="ctrl-l">Speed</span>
              <input type="range" min=".25" max="2" step=".05" value={spd} onChange={e=>setSpd(parseFloat(e.target.value))}/>
              <span className="spd-v">{spd}×</span>
              <div className="sps">{[.25,.5,1,1.5,2].map(v=><button key={v} className={`sp${Math.abs(spd-v)<.01?" on":""}`} onClick={()=>setSpd(v)}>{v===.25?"¼×":v===.5?"½×":v+"×"}</button>)}</div>
            </div>
            <div className="pb-row">
              <button className="pb" onClick={()=>ytCmd("playVideo")}>▶</button>
              <button className="pb" onClick={()=>ytCmd("pauseVideo")}>⏸</button>
              <button className="pb" onClick={()=>ytCmd("seekTo",[0,true])}>↺</button>
            </div>
            <div className="ph-wrap">
              <div className="ph-l">Phase — tap to jump + morph</div>
              <div className="ph-strip">{tech.phases.map((p,i)=><button key={i} className={`phb${phIdx===i?" on":""}`} onClick={()=>pickPhase(i)}>{p.n}</button>)}</div>
            </div>
            {(phase?.p||[]).length>0&&(
              <div className="mtags">
                <span style={{fontSize:9,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:T.accent,marginRight:4,alignSelf:"center"}}>Firing</span>
                {(phase?.p||[]).map(k=>{const [r,g,b]=MC[k]||[255,255,255];return <span key={k} className="mtag" style={{background:`rgba(${r},${g},${b},.14)`,color:`rgb(${r},${g},${b})`,border:`1px solid rgba(${r},${g},${b},.35)`}}>{ML[k]||k}</span>;})}
              </div>
            )}
            {phase&&(
              <div className="dcards">
                <div className="ph-title">{phase.n}</div>
                <div className="dcard" style={{background:"rgba(6,214,160,.05)",borderColor:"rgba(6,214,160,.2)"}}>
                  <div className="dcard-l" style={{color:T.green}}>✓ What to feel</div>
                  <div style={{color:"rgba(180,255,220,.85)"}}>{phase.feel}</div>
                </div>
                <div className="dcard" style={{background:"rgba(255,82,82,.05)",borderColor:"rgba(255,82,82,.2)"}}>
                  <div className="dcard-l" style={{color:T.red}}>✗ Common mistake</div>
                  <div style={{color:"rgba(255,180,180,.85)"}}>{phase.err}</div>
                </div>
                <button className="ask-btn" onClick={()=>{setInput(`I'm on "${phase.n}" in ${tech.name}. ${phase.feel} — explain the biomechanics.`);setNav("sensei");}}>
                  <span style={{fontSize:16}}>⛩</span> Ask Sensei about this phase <span style={{marginLeft:"auto",opacity:.5}}>→</span>
                </button>
              </div>
            )}
          </>)}

          {/* PROFILE */}
          {nav==="profile"&&(<>
            <div className="prof-hero">
              <div className="prof-av">🥋</div>
              <div className="prof-name">Athlete</div>
              <div className="prof-meta">{disc?.label} · {LS.get("champ_level","intermediate")}</div>
              <div className="prof-stats">
                <div><div className="psn">{streak}</div><div className="psl">Streak</div></div>
                <div><div className="psn">{weaknesses.length}</div><div className="psl">Weaknesses</div></div>
                <div><div className="psn">{drillPlan?"1":"0"}</div><div className="psl">Plans</div></div>
              </div>
            </div>
            <div className="row" onClick={()=>setNav("diag")}>
              <div className="row-i">🔧</div>
              <div className="row-l">System Diagnostics</div>
              <div className="row-v">›</div>
            </div>
            <div className="row" onClick={()=>{setBoot(true);setOnbStep(0);}}>
              <div className="row-i">↻</div>
              <div className="row-l">Re-run onboarding</div>
              <div className="row-v">›</div>
            </div>
            <div className="row" onClick={()=>{if(confirm("Clear all data?")){localStorage.clear();window.location.reload();}}}>
              <div className="row-i" style={{background:"rgba(255,82,82,.1)"}}>🗑</div>
              <div className="row-l" style={{color:T.red}}>Reset all data</div>
              <div className="row-v">›</div>
            </div>
            {weaknesses.length>0&&(
              <div style={{padding:"18px"}}>
                <div className="sec-l" style={{marginBottom:10}}>Tracked weaknesses</div>
                {weaknesses.map((w,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:T.bg1,border:`1px solid ${T.border}`,marginBottom:6}}>
                    <span style={{color:T.accent,fontWeight:700,fontSize:11,letterSpacing:".1em"}}>#{i+1}</span>
                    <div style={{flex:1,fontSize:12,color:T.ink}}>{w}</div>
                    <button onClick={()=>setWeaknesses(ws=>ws.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:T.inkMuted,fontSize:14,cursor:"pointer"}}>×</button>
                  </div>
                ))}
              </div>
            )}
          </>)}

          {/* DIAGNOSTICS */}
          {nav==="diag"&&(<>
            <div className="back-row">
              <button className="bb" onClick={()=>setNav("profile")}>‹</button>
              <div>
                <div className="b-disc">System</div>
                <div className="b-name">Diagnostics</div>
              </div>
            </div>
            <div style={{padding:"8px 18px 18px"}}>
              <p style={{fontSize:12,color:T.inkSub,lineHeight:1.6,marginBottom:14}}>Champion runs these tests to verify everything works on your device. Tap below to run them.</p>
              <button onClick={runDiag} disabled={diagRunning} style={{width:"100%",padding:12,background:T.accent,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".04em",fontFamily:"'Inter',sans-serif",marginBottom:14}}>
                {diagRunning?<><span className="spin"/> Running tests…</>:"▶ Run All Tests"}
              </button>
              {diag&&Object.entries(diag).map(([k,r])=>(
                <div key={k} className="diag-pill">
                  <div className="diag-dot" style={{background:r.ok?T.green:T.red,boxShadow:`0 0 6px ${r.ok?T.green:T.red}`}}/>
                  <div style={{flex:1}}>
                    <div className="diag-name">{({api:"API Connection",canvas:"Canvas Rendering",storage:"Local Storage",poseData:"Pose Data Integrity",techCount:"Technique Library",viewport:"Viewport Size",rAF:"Animation Loop"})[k]||k}</div>
                    <div className="diag-detail">{r.detail}</div>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",color:r.ok?T.green:T.red}}>{r.ok?"PASS":"FAIL"}</div>
                </div>
              ))}
              {!diag&&!diagRunning&&<div style={{padding:"32px 0",textAlign:"center",color:T.inkMuted,fontSize:12}}>Tap "Run All Tests" to start.</div>}
            </div>
          </>)}

          <div style={{height:16}}/>
        </div>
      )}

      <div className="bnav">
        {[["train","🥋","Train"],["sensei","⛩","Sensei"],["profile","👤","Profile"]].map(([id,icon,lbl])=>(
          <button key={id} className={`ni${nav===id||(nav==="diag"&&id==="profile")?" on":""}`} onClick={()=>{setNav(id);if(id==="train")setTech(null);}}>
            <span className="ni-ic">{icon}</span>
            <span className="ni-lb">{lbl}</span>
          </button>
        ))}
      </div>

      {toast&&<div className="toast">{toast}</div>}
    </div>
  </>);
}
