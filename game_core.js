/**
 * PANDEMIC DIRECTIVE: ZERO HOUR
 * CORE LOGIC - REVISED
 */

// ==========================================
// 1. GAME STATE
// ==========================================

let state = {
  day: 1,

  // core stats (0.0 - 1.0)
  population: 1.0,      
  economy: 0.80,        
  trust: 0.70,          
  
  // threat levels
  infection: 0.05,      
  healthcare_load: 0.10, 

  // advisor influence (0 - 100)
  advisors: {
    kael: 50, // militaristic / order
    aris: 50  // scientific / humanitarian
  },

  // story tracking
  arc: 'main', // 'main', 'riots', 'cure_race'
  arcProgress: 0,
  
  // flags for events
  flags: {
    criticalMode: false, 
    lockdown: false,
    militarized: false,
    cure_progress: 0,
    sterility: false,
    border_closed: false,
    media_censored: false
  },

  // holder for current turn data
  activeInterruption: null,
  currentScenario: null
};

// ==========================================
// 2. MATH & HELPERS
// ==========================================

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function normalizeState() {
  state.population = clamp(state.population);
  state.economy = clamp(state.economy);
  state.trust = clamp(state.trust);
  state.infection = clamp(state.infection);
  state.healthcare_load = clamp(state.healthcare_load);
  
  state.advisors.kael = Math.max(0, Math.min(100, state.advisors.kael));
  state.advisors.aris = Math.max(0, Math.min(100, state.advisors.aris));
}

// rng helper
function noise(scale = 0.02) {
  return (Math.random() - 0.5) * scale;
}

// shift advisor loyalty
function modifyLoyalty(advisor, amount) {
  if (advisor === 'kael') {
    state.advisors.kael += amount;
    state.advisors.aris -= (amount / 3); // less punishment for disagreement
  } else if (advisor === 'aris') {
    state.advisors.aris += amount;
    state.advisors.kael -= (amount / 3);
  }
}

// ==========================================
// 3. SIMULATION ENGINE
// ==========================================

function runDailySimulation() {
  // 1. Infection Spread (Logistic with modifiers)
  let spreadRate = 0.15; 
  if (state.flags.lockdown) spreadRate -= 0.12;
  if (state.flags.border_closed) spreadRate -= 0.05;
  if (state.trust < 0.4) spreadRate += 0.06; // panic spreading
  if (state.healthcare_load > 0.9) spreadRate += 0.05; // hospitals overwhelmed
  
  // endless mode scaling
  if (state.day > 25) spreadRate += 0.03 * (state.day - 25);

  let growth = spreadRate * state.infection * (1 - state.infection);
  state.infection += growth + noise(0.01);

  // 2. Healthcare Logic
  let targetLoad = state.infection * 1.3;
  // smooth interpolation towards target
  state.healthcare_load += (targetLoad - state.healthcare_load) * 0.25;
  state.healthcare_load += 0.01; // base fatigue

  // 3. Economy Logic
  let ecoDecay = 0.005; // base upkeep
  if (state.flags.lockdown) ecoDecay += 0.03; // lockdowns hurt wallet
  if (state.infection > 0.3) ecoDecay += 0.02; // sick workers
  if (state.trust < 0.3) ecoDecay += 0.02; // civil unrest
  state.economy -= ecoDecay;

  // 4. Population (Mortality)
  let mortalityRate = 0.001; 
  mortalityRate += (state.infection * 0.015);
  // death spike if hospitals full
  if (state.healthcare_load > 0.95) mortalityRate += 0.03;
  state.population -= mortalityRate;

  // 5. Trust (The glue)
  if (state.economy < 0.3) state.trust -= 0.02; // broke people are angry
  if (state.population < 0.85) state.trust -= 0.03; // grief causes anger
  if (state.flags.media_censored) state.trust -= 0.01; // slow decay from lies

  // 6. Advisor Coup/Resignation Checks
  checkAdvisorStatus();

  normalizeState();
}

function checkAdvisorStatus() {
  if (state.advisors.kael <= 10 && !state.flags.kael_rebelled) {
    state.flags.kael_rebelled = true;
    state.trust -= 0.15;
    state.flags.militarized = false; 
    triggerInterruption("MILITARY COUP", "General Kael has turned the joint chiefs against you.", [
      { text: "Purge the military command.", effect: (s) => { s.population -= 0.05; s.trust -= 0.10; } }
    ]);
  }
  
  if (state.advisors.aris <= 10 && !state.flags.aris_resigned) {
    state.flags.aris_resigned = true;
    state.healthcare_load += 0.25; 
    state.trust -= 0.10;
    triggerInterruption("MEDICAL WALKOUT", "Dr. Aris resigned. Doctors are striking.", [
      { text: "Force them back to work.", effect: (s) => { s.trust -= 0.15; s.healthcare_load -= 0.05; } }
    ]);
  }
}

// ==========================================
// 4. CONTENT & NARRATIVE
// ==========================================

// -- SIDE CHARACTERS POOL --
const sideEvents = [
  {
    name: "Elara (Union Rep)",
    text: "DIRECTIVE: UNION STRIKE\nElara, representing the transport union, says drivers refuse to work without 3x hazard pay. Supply lines are stalling.",
    choices: [
      { text: "Pay them. (Costs Economy)", effect: (s) => { s.economy -= 0.08; s.trust += 0.05; } },
      { text: "Federalize transport. (Forces work)", effect: (s) => { s.trust -= 0.10; s.economy += 0.02; } }
    ]
  },
  {
    name: "Director Vance (Intel)",
    text: "DIRECTIVE: INFO CONTROL\nDirector Vance has found a journalist about to publish the true mortality rates. It will cause panic.",
    choices: [
      { text: "Silence the journalist.", effect: (s) => { s.flags.media_censored = true; s.trust += 0.05; s.trust -= 0.02; /* subtle hit later */ } },
      { text: "Let them publish.", effect: (s) => { s.trust -= 0.15; s.infection -= 0.05; /* panic makes people stay home */ } }
    ]
  },
  {
    name: "Bishop Calloway",
    text: "DIRECTIVE: FAITH\nBishop Calloway demands churches remain open for prayer services to keep morale high.",
    choices: [
      { text: "Allow services.", effect: (s) => { s.trust += 0.10; s.infection += 0.08; } },
      { text: "Ban gatherings.", effect: (s) => { s.trust -= 0.10; s.infection -= 0.02; } }
    ]
  }
];

// -- GENERIC FILLER POOL (No characters) --
const genericEvents = [
  {
    text: "STATUS: SUPPLY CHAIN\nMedical supplies are stuck at the port due to lack of workers.",
    choices: [
      { text: "Deploy National Guard to move cargo.", effect: (s) => { s.flags.militarized = true; s.economy += 0.02; s.trust -= 0.02; } },
      { text: "Wait for workers.", effect: (s) => { s.healthcare_load += 0.05; } }
    ]
  },
  {
    text: "STATUS: STOCK MARKET\nIndices are crashing. Investors are panic selling.",
    choices: [
      { text: "Close the stock market.", effect: (s) => { s.economy -= 0.05; s.trust += 0.02; } },
      { text: "Inject stimulus funds.", effect: (s) => { s.economy += 0.05; s.trust -= 0.05; /* inflation fear */ } }
    ]
  },
  {
    text: "STATUS: CRIME SPIKE\nLooting reported in downtown districts.",
    choices: [
      { text: "Increase police presence.", effect: (s) => { s.trust -= 0.05; s.economy -= 0.02; } },
      { text: "Ignore minor crimes.", effect: (s) => { s.trust -= 0.10; s.economy -= 0.05; } }
    ]
  }
];

// -- MAIN STORY --
const storyArcs = {
  main: {
    1: {
      text: "DAY 1: PATIENT ZERO\nGeneral Kael wants to lock down the sector immediately. Dr. Aris wants to send a medical team to assess first.",
      choices: [
        { text: "[KAEL] Lockdown sector. No one leaves.", effect: (s) => { s.infection -= 0.02; s.trust -= 0.05; modifyLoyalty('kael', 10); } },
        { text: "[ARIS] Assess first. Avoid panic.", effect: (s) => { s.trust += 0.05; s.economy -= 0.02; modifyLoyalty('aris', 10); } }
      ]
    },
    5: {
      text: "DAY 5: ESCALATION\nThe virus has crossed state lines. Borders are porous.",
      choices: [
        { text: "[KAEL] Close all domestic borders.", effect: (s) => { s.flags.border_closed = true; s.economy -= 0.15; s.infection -= 0.05; modifyLoyalty('kael', 10); } },
        { text: "[ARIS] Screen travelers only.", effect: (s) => { s.infection += 0.08; s.economy -= 0.02; modifyLoyalty('aris', 10); } }
      ]
    },
    12: {
      text: "DAY 12: THE SHORTAGE\nWe are out of ventilators. We have to choose who gets them.",
      choices: [
        { text: "[KAEL] Prioritize essential workers/military.", effect: (s) => { s.trust -= 0.15; s.population -= 0.02; modifyLoyalty('kael', 15); } },
        { text: "[ARIS] Lottery system. Fair chance.", effect: (s) => { s.trust += 0.05; s.population -= 0.04; modifyLoyalty('aris', 10); } }
      ]
    },
    18: {
      text: "DAY 18: VACCINE TRIALS\nDr. Aris has a prototype. It's risky.",
      choices: [
        { text: "[ARIS] Authorize human testing.", effect: (s) => { s.flags.cure_progress += 35; s.trust -= 0.10; modifyLoyalty('aris', 20); } },
        { text: "Wait for animal trial results.", effect: (s) => { s.flags.cure_progress += 5; s.population -= 0.05; /* delay kills */ } }
      ]
    }
  },

  // BRANCH: RIOTS (Trust < 0.4)
  riots: [
    {
      text: "ARC: INSURRECTION - DAY 1\nThe people have had enough. Government buildings are burning.",
      choices: [
        { text: "[KAEL] Deploy live ammunition.", effect: (s) => { s.population -= 0.05; s.trust -= 0.30; s.flags.militarized = true; modifyLoyalty('kael', 20); } },
        { text: "Attempt to negotiate.", effect: (s) => { s.economy -= 0.15; s.trust += 0.10; } }
      ]
    },
    {
      text: "ARC: INSURRECTION - DAY 2\nRebels control the power grid.",
      choices: [
        { text: "Storm the plant.", effect: (s) => { s.economy -= 0.10; s.flags.militarized = true; } },
        { text: "Cut a deal.", effect: (s) => { s.economy -= 0.20; s.trust += 0.05; } }
      ]
    }
  ],

  // BRANCH: CURE (Progress > 40)
  cure_race: [
    {
      text: "ARC: THE CURE - STAGE 1\nWe need compute power to finalize the sequence.",
      choices: [
        { text: "Seize bank servers.", effect: (s) => { s.economy -= 0.25; s.flags.cure_progress += 25; } },
        { text: "Ask for global help.", effect: (s) => { s.flags.cure_progress += 15; s.trust += 0.05; } }
      ]
    },
    {
      text: "ARC: THE CURE - STAGE 2\nDistribution is the final hurdle.",
      choices: [
        { text: "[ARIS] Free for everyone.", effect: (s) => { s.flags.cure_progress = 100; s.infection -= 0.30; s.trust += 0.20; modifyLoyalty('aris', 20); } },
        { text: "[KAEL] Sell to allies first.", effect: (s) => { s.economy += 0.40; s.trust -= 0.20; s.flags.cure_progress = 90; modifyLoyalty('kael', 20); } }
      ]
    }
  ]
};

// -- ENDLESS MODE --
function generateEndlessScenario() {
  const templates = [
    { title: "MUTATION", desc: "Virus is adapting.", choices: [{ text: "Rush booster.", effect: (s) => { s.economy -= 0.10; s.infection -= 0.05; } }, { text: "Lockdown.", effect: (s) => { s.flags.lockdown = true; } }] },
    { title: "MARKET CRASH", desc: "Economy freefall.", choices: [{ text: "Austerity.", effect: (s) => { s.trust -= 0.10; s.economy += 0.10; } }, { text: "Bailout.", effect: (s) => { s.economy -= 0.15; s.trust += 0.05; } }] }
  ];
  const t = templates[Math.floor(Math.random() * templates.length)];
  return { text: `SURVIVAL DAY ${state.day}\n${t.title}: ${t.desc}`, choices: t.choices };
}

// -- SCENARIO SELECTOR --
function getDailyContent() {
  if (state.day > 25) return generateEndlessScenario();

  // Check Branch Triggers
  if (state.arc === 'main') {
    if (state.trust < 0.40) state.arc = 'riots'; // easier to trigger
    if (state.flags.cure_progress > 40) state.arc = 'cure_race'; // easier to trigger
  }

  // Handle Branches
  if (state.arc === 'riots' || state.arc === 'cure_race') {
    const list = storyArcs[state.arc];
    if (list[state.arcProgress]) {
      // Don't increment progress here, do it after choice
      return list[state.arcProgress];
    }
    state.arc = 'main'; // fall back if branch ends
  }

  // Handle Fixed Main Story
  if (storyArcs.main[state.day]) return storyArcs.main[state.day];

  // Handle Random Side Characters (30% chance on empty days)
  if (Math.random() < 0.3) {
    const sideEvent = sideEvents[Math.floor(Math.random() * sideEvents.length)];
    return sideEvent;
  }

  // Fallback to Generic Events
  const generic = genericEvents[Math.floor(Math.random() * genericEvents.length)];
  return generic;
}

// ==========================================
// 5. INTERRUPTIONS
// ==========================================

function triggerInterruption(title, text, choices) {
  state.activeInterruption = { text: `*** ${title} ***\n${text}`, choices: choices };
}

// ==========================================
// 6. ENDINGS
// ==========================================

function checkEnding() {
  // Survival Mode
  if (state.day > 25) {
    if (state.population < 0.10) return "SURVIVAL END: EXTINCTION";
    if (state.economy < 0.05) return "SURVIVAL END: TOTAL COLLAPSE";
    return null; 
  }

  // Standard Endings
  if (state.population < 0.15) return "ENDING: EXTINCTION\nSilence falls over the cities.";
  if (state.economy < 0.10) return "ENDING: FAILED STATE\nMoney is worthless. Warlords rule.";
  if (state.trust < 0.10) return "ENDING: REVOLUTION\nThe guillotine awaits you.";
  if (state.healthcare_load >= 1.0 && state.infection > 0.60) return "ENDING: SYSTEM FAILURE\nThe sick have nowhere to go.";

  // New Conditional Endings
  if (state.advisors.kael > 80 && state.trust < 0.4 && state.economy > 0.6) {
    return "ENDING: TOTALITARIAN STATE\nOrder restored, but freedom is dead. You rule with an iron fist.";
  }
  
  if (state.flags.cure_progress >= 100 && state.population < 0.5) {
    return "ENDING: PYRRHIC VICTORY\nWe found the cure, but half the world is gone.";
  }

  if (state.flags.border_closed && state.infection < 0.1 && state.economy < 0.4) {
    return "ENDING: ISOLATIONIST\nThe nation survived, but we stand alone in the dark.";
  }

  return null;
}

// ==========================================
// 7. PUBLIC API (Called by HTML)
// ==========================================

function getStatusReport() {
  normalizeState();
  let modeStr = state.day > 25 ? " [SURVIVAL]" : "";
  
  return `
REPORT - DAY ${state.day}${modeStr}
----------------------------
POP:  ${(state.population * 100).toFixed(0)}% | TRUST: ${(state.trust * 100).toFixed(0)}%
ECO:  ${(state.economy * 100).toFixed(0)}% | INF:   ${(state.infection * 100).toFixed(0)}%
HLTH: ${(state.healthcare_load * 100).toFixed(0)}% LOAD
----------------------------
`;
}

function advanceDay(choiceIndex = null) {
  let output = [];

  // 1. Process Input
  if (choiceIndex !== null) {
    // If we didn't save the scenario, we regenerate it. 
    // In a stateless system this can be jittery with RNG, but acceptable for this scope.
    if (!state.currentScenario) state.currentScenario = getDailyContent();
    
    let choices = state.activeInterruption ? state.activeInterruption.choices : state.currentScenario.choices;
    
    if (choices[choiceIndex]) {
      output.push(`>> ACTION: ${choices[choiceIndex].text}`);
      choices[choiceIndex].effect(state);

      // Clean up state after choice
      if (state.activeInterruption) {
        state.activeInterruption = null;
      } else {
        if (state.arc === 'riots' || state.arc === 'cure_race') state.arcProgress++;
        runDailySimulation();
        state.day++;
        state.currentScenario = null; // force regen next turn
      }
    } else {
      return { 
        text: ">> INVALID INPUT.\n" + (state.activeInterruption ? state.activeInterruption.text : state.currentScenario.text), 
        choices: choices.length, 
        ended: false, 
        critical: state.flags.criticalMode 
      };
    }
  }

  // 2. Prep Next Scenario
  if (!state.currentScenario && !state.activeInterruption) {
    state.currentScenario = getDailyContent();
  }

  // 3. Visuals & Endings
  if (state.population < 0.70) state.flags.criticalMode = true;
  else state.flags.criticalMode = false;

  const ending = checkEnding();
  if (ending) {
    output.push(getStatusReport());
    output.push("\n================================");
    output.push(ending);
    output.push("================================");
    return { text: output.join("\n"), choices: 0, ended: true, critical: state.flags.criticalMode };
  }

  // 4. Output
  output.push(getStatusReport());
  let scene = state.activeInterruption ? state.activeInterruption : state.currentScenario;
  
  output.push(scene.text);
  output.push("");
  scene.choices.forEach((c, i) => output.push(`[${i + 1}] ${c.text}`));

  return {
    text: output.join("\n"),
    choices: scene.choices.length,
    ended: false,
    critical: state.flags.criticalMode
  };
}
