export const DISC = [
  { id:"boxing",    label:"Boxing",     icon:"🥊", color:"#ff3d00" },
  { id:"muaythai",  label:"Muay Thai",  icon:"🦵", color:"#ff8a3d" },
  { id:"kicks",     label:"Kicks",      icon:"⚡", color:"#ffd166" },
  { id:"wrestling", label:"Wrestling",  icon:"🤼", color:"#00d4ff" },
  { id:"bjj",       label:"BJJ",        icon:"♟",  color:"#7c4dff" },
  { id:"clinch",    label:"Clinch",     icon:"🔗", color:"#06d6a0" },
  { id:"arms",      label:"Arm Locks",  icon:"💪", color:"#8b5cf6" },
  { id:"chokes",    label:"Chokes",     icon:"🩸", color:"#e040fb" },
  { id:"legs",      label:"Leg Locks",  icon:"🦿", color:"#aa00ff" },
  { id:"defense",   label:"Defense",    icon:"🛡", color:"#00b0ff" },
];

export const ph = (t, n, po, p, sc, feel, err) => ({ t, n, pose: po, p, sc, feel, err });

export const TECHS = {
  boxing:[
    {id:"jab",name:"Jab",diff:1,videoSrc:"/videos/jab.mp4",videoId:"5yCaM3oFpLA",phases:[
      { ...ph(0.00,"Guard","guard",["calves","hipAbd"],["quads","erectors"],"Weight on balls of feet. Rear heel up — spring loaded.","Flat rear heel kills hip rotation before the cross even starts."),
        chain: [
          { m: "calves",   t: 0.00, w: "primary"   },
          { m: "hipAbd",   t: 0.00, w: "primary"   },
          { m: "quads",    t: 0.00, w: "secondary" },
          { m: "erectors", t: 0.00, w: "secondary" },
        ] },
      { ...ph(0.90,"Push & Rotate","guard",["calves","obliques","pecs"],["delts","triceps"],"Lead oblique snaps. Shoulder rises to shield chin.","Arm-only jab loses 60% of force. Body drives the punch."),
        chain: [
          { m: "calves",   t: 0.00, w: "primary"   },
          { m: "glutes",   t: 0.10, w: "primary"   },
          { m: "hipAbd",   t: 0.10, w: "secondary" },
          { m: "obliques", t: 0.25, w: "primary"   },
          { m: "lats",     t: 0.30, w: "secondary" },
          { m: "delts",    t: 0.50, w: "secondary" },
          { m: "serratus", t: 0.55, w: "primary"   },
          { m: "triceps",  t: 0.65, w: "secondary" },
        ] },
      { ...ph(1.30,"Extension","jab_ext",["pecs","delts","triceps","serratus"],["obliques","traps"],"Serratus protracts the scapula at the last inch — that's reach.","Stopping short loses reach and the serratus contribution."),
        chain: [
          { m: "pecs",     t: 0.00, w: "primary"   },
          { m: "delts",    t: 0.00, w: "primary"   },
          { m: "triceps",  t: 0.00, w: "primary"   },
          { m: "obliques", t: 0.05, w: "secondary" },
          { m: "traps",    t: 0.10, w: "secondary" },
          { m: "serratus", t: 0.70, w: "primary"   },
        ] },
      { ...ph(1.60,"Snap Back","guard",["biceps","traps"],["obliques"],"Return AS fast as it extended. A slow jab is an arm to grab.","Slow retraction leaves the arm out as a target."),
        chain: [
          { m: "biceps",   t: 0.00, w: "primary"   },
          { m: "obliques", t: 0.15, w: "secondary" },
          { m: "traps",    t: 0.25, w: "primary"   },
        ] },
    ]},
    {id:"cross",name:"Cross",diff:1,videoId:"E03oBhSDzbc",phases:[
      ph(0,"Loaded","guard",["calves","hipAbd"],["quads"],"Rear heel up. Hip coiled. Everything pre-loaded.","Flat rear foot — the cross cannot rotate the hip."),
      ph(8,"Hip First","cross_hip",["calves","quads","glutes","obliques"],["erectors","hipFx"],"Floor → calf → quad → glute → obliques. Hip FIRST.","Arm before hip — the most common power leak in boxing."),
      ph(22,"Delivery","cross_ext",["pecs","delts","triceps","serratus"],["lats","traps","forearms"],"Arm extends AFTER hip rotates. Palm faces down.","Over-rotating drops guard and exposes chin."),
      ph(34,"Recover","guard",["biceps","traps"],["obliques"],"Snap back, both hands return simultaneously.","Admiring the punch invites a counter."),
    ]},
    {id:"hook",name:"Lead Hook",diff:2,videoId:"cMWOHFLJSuY",phases:[
      ph(0,"Pivot","hook_load",["calves","obliques"],["hipAbd","quads"],"Lead foot pivots out. Hip snaps. Arm stays at 90°.","Swinging only the arm — slow and telegraphed."),
      ph(10,"Hip Snap","hook_snap",["obliques","glutes","quads"],["erectors"],"Hip snap generates all power. Elbow leads, not the fist.","Elbow below 90° turns a hook into a swing."),
      ph(20,"Impact","guard",["pecs","delts","biceps"],["traps","forearms"],"Fist clenches ONLY at contact. Relax before.","Clenched through the swing bleeds all power."),
    ]},
  ],
  muaythai:[
    {id:"mt_round",name:"Roundhouse",diff:2,videoSrc:"/videos/roundhouse.mp4",videoId:"wwc4cnvkwnk",phases:[
      ph(0,"Stance","mt_stance",["calves","quads"],["hipAbd","erectors"],"Both heels up. Knees soft. A coiled spring.","Flat feet — you cannot pivot. Every Muay Thai kick dies here."),
      ph(10,"Step","mt_stance",["calves","glutes","hipFx"],["obliques","quads"],"Lead foot steps 45°. Kicking hip pre-loads.","Skipping the step — worse balance, less power."),
      ph(20,"Pivot","mt_chamber",["calves","tibAnt","hipAbd"],["erectors"],"Support heel turns to face target. Hip fully opens.","Half-pivot limits rotation. 90° minimum."),
      ph(30,"Hip Drive","mt_hip",["glutes","obliques","erectors"],["hipFx","hipAbd"],"Opposite arm swings BACK — boosts rotation.","Keeping arm up blocks full hip rotation."),
      ph(40,"Impact","mt_impact",["quads","hams","calves"],["glutes","obliques"],"Lower 1/3 tibia. Leg loose — rigid ONLY at impact.","Kicking with the foot — less force, ankle injury risk."),
      ph(50,"Recover","mt_stance",["hams","hipFx"],["calves","hipAbd"],"Active hamstring pull. Land on ball of foot.","Dropping the leg — off balance, can be caught."),
    ]},
    {id:"teep",name:"Teep",diff:1,videoId:"wwc4cnvkwnk",phases:[
      ph(0,"Chamber","mt_chamber",["hipFx","rectAb"],["calves","quads"],"Knee up to waist height. Foot cocked like a piston.","Low chamber becomes a push. No range control."),
      ph(12,"Thrust","mt_hip",["quads","glutes","calves"],["erectors"],"Hip shoots FORWARD. Heel leads.","Only extending leg without hip — power halved."),
      ph(22,"Recover","mt_stance",["hams","hipFx"],["calves"],"Pull back same way it fired. Land on ball of foot.","Dropping the leg — off balance."),
    ]},
  ],
  kicks:[
    {id:"sidekick",name:"Side Kick",diff:2,videoId:"Y-UXlcgjKSE",phases:[
      ph(0,"Chamber","mt_chamber",["hipFx","quads"],["calves","hipAbd"],"Knee chambers sideways — hip flexes AND abducts.","Chambering forward destroys the side angle."),
      ph(12,"Thrust","mt_hip",["quads","glutes","hipAbd"],["erectors","calves"],"Hip shoots out. HEEL leads.","Pushing with ball of foot — less impact, ankle risk."),
      ph(22,"Recover","mt_stance",["hams","hipFx"],["adductors"],"Chamber back before setting down.","Dropping foot straight down — no follow-up."),
    ]},
  ],
  wrestling:[
    {id:"dleg",name:"Double Leg",diff:2,videoSrc:"/videos/dleg.mp4",videoId:"Fl4RkzHvSLg",phases:[
      ph(0,"Set-Up","guard",["quads","calves"],["hipAbd","erectors"],"Hands up, head moving. Wait for the reactive window.","Shooting blind — they're sprawling before you arrive."),
      ph(8,"Level Change","dleg_lev",["quads","glutes","calves"],["erectors","hipFx"],"Drop from KNEES. Back flat. Eyes FORWARD.","Bending at waist — telegraphed, slow, destroys posture."),
      ph(16,"Penetration","dleg_shot",["quads","glutes","calves"],["erectors","obliques"],"Lead knee to floor. Head OUTSIDE their hip.","Head center = guillotine setup."),
      ph(26,"Lock Grip","dleg_grip",["lats","biceps","forearms"],["pecs","delts"],"Arms lock BEHIND the knees.","Grabbing AT knees — they push your head down."),
      ph(36,"Drive","dleg_lev",["glutes","quads","calves","lats"],["erectors","obliques"],"Legs churn like a sprint. 3 full steps minimum.","Stopping at first contact — gives them the sprawl."),
    ]},
  ],
  bjj:[
    {id:"armbar",name:"Armbar",diff:2,videoSrc:"/videos/armbar.mp4",videoId:"BsP3PO57uxc",phases:[
      ph(0,"Break Posture","ab_guard",["rectAb","hipFx"],["adductors","erectors"],"Guard legs pull DOWN. Both hands grip wrist — THUMB UP.","Thumb down rotates elbow wrong. Lock fails."),
      ph(10,"Swing Legs","ab_guard",["hipFx","adductors","obliques"],["rectAb","quads"],"Fast committed swing to perpendicular.","Slow swing — they posture up and angle is lost."),
      ph(20,"Pinch Knees","ab_guard",["adductors","quads"],["hipFx","hams"],"Inner thighs CLAMP above bicep. Zero gap.","Any gap = #1 armbar escape."),
      ph(30,"Hip Bridge","ab_bridge",["glutes","hams"],["erectors","adductors"],"Drive hips UP like a max hip thrust.","Pulling arm with arm strength — wrong direction."),
    ]},
    {id:"rnc",name:"Rear Naked Choke",diff:2,videoId:"4xmC1MipMD4",phases:[
      ph(0,"Back Control","guard",["adductors","calves"],["glutes","erectors"],"Hooks inside thighs. Chest to their back.","Hooks outside — they rotate into you."),
      ph(10,"Blade Under","rnc_wrap",["pecs","lats","biceps"],["forearms","delts"],"BLADE of forearm on carotid — slide deep.","Crook on throat = air choke. Outlast."),
      ph(22,"Figure Four","rnc_wrap",["biceps","pecs","lats"],["forearms","delts"],"Free hand grips BICEP of choking arm.","Hand behind head — loses leverage."),
      ph(32,"Squeeze","rnc_wrap",["pecs","lats","biceps","forearms"],["glutes","erectors"],"Whole body: pec, lat, back arch.","Arms-only squeeze tires fast."),
    ]},
  ],
  clinch:[{id:"plum",name:"Thai Clinch",diff:2,videoId:"wwc4cnvkwnk",phases:[
    ph(0,"Enter","guard",["delts","traps","biceps"],["erectors"],"Both hands behind head. Fingers interlaced.","Crossing hands — they peel apart."),
    ph(12,"Cave Elbows","rnc_wrap",["lats","traps","biceps"],["obliques"],"Elbows cave IN. Posture broken.","Elbows flaring — they posture up."),
    ph(22,"Knee","mt_chamber",["hipFx","quads","calves"],["rectAb","glutes"],"Drive knee from hip. Pull them onto it.","Letting them step back — knee misses."),
  ]}],
  arms:[{id:"kimura",name:"Kimura",diff:2,videoId:"mGrauiHNT-g",phases:[
    ph(0,"Figure Four","guard",["pecs","delts","biceps"],["forearms"],"Hand on wrist, other arm grips your wrist.","Wrong grip direction — no leverage."),
    ph(12,"Isolate","guard",["lats","biceps","pecs"],["obliques"],"Pin elbow to chest. Their arm is your lever.","Elbow drifts — they recover."),
    ph(22,"Rotate","hook_snap",["delts","pecs","lats"],["biceps","traps"],"Rotate hand toward back. Small motion = huge pressure.","Forcing with speed — needs leverage."),
  ]}],
  chokes:[{id:"guillotine",name:"Guillotine",diff:2,videoId:"4xmC1MipMD4",phases:[
    ph(0,"Wrap","rnc_wrap",["pecs","biceps","forearms"],["delts","traps"],"Arm wraps neck. Crook on carotid.","Wrapping the throat — air choke."),
    ph(12,"Drive","rnc_wrap",["lats","pecs","biceps"],["obliques","erectors"],"Free hand grips wrist. Hips drive forward.","Posture breaks — they pull head out."),
    ph(22,"Finish","rnc_wrap",["lats","pecs","biceps","forearms"],["glutes","quads"],"Hips forward, arms pull neck up.","Pulling down — wrong direction."),
  ]}],
  legs:[{id:"heelhook",name:"Inside Heel Hook",diff:3,videoId:"mGrauiHNT-g",phases:[
    ph(0,"Entangle","ab_guard",["adductors","hams"],["calves","quads"],"Knee inside their leg. Control first.","Going for heel without position."),
    ph(12,"Seat & Grip","ab_guard",["glutes","adductors"],["hams","quads"],"Sit to hip. Both hands on heel.","Gap between bodies — they roll out."),
    ph(24,"Rotate","ab_bridge",["lats","biceps","pecs"],["forearms","delts"],"Rotate heel MEDIALLY. Knee rotates.","Pulling straight — that's an ankle lock."),
  ]}],
  defense:[
    {id:"sprawl",name:"Sprawl",diff:2,videoId:"rXbF1aJfhGo",phases:[
      ph(0,"Read Shot","guard",["calves","quads"],["erectors","hipAbd"],"See the level change BEFORE they reach you.","Waiting until they have your legs — too late."),
      ph(8,"Hip Drop","sprawl",["glutes","erectors","quads"],["calves","hams"],"Hips drop, full weight pins shoulders.","Hips too high — they pick a leg."),
      ph(18,"Control","sprawl",["lats","pecs","traps"],["obliques","forearms"],"Chest-to-back. Head to mat.","No upper body control — they scramble up."),
    ]},
    {id:"slip",name:"Slip",diff:1,videoId:"5yCaM3oFpLA",phases:[
      ph(0,"Read","guard",["calves","quads"],["erectors"],"Watch shoulder load. Slip JUST before.","Moving too early — they adjust."),
      ph(10,"Rotate","hook_load",["obliques","erectors"],["calves","hipAbd"],"Head off centerline via body rotation.","Leaning only the neck — vulnerable."),
      ph(18,"Counter","jab_ext",["obliques","quads","calves"],["pecs","delts"],"Counter from the slipped position.","No counter — slip is just retreat."),
    ]},
  ],
};
