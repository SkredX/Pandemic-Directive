/**
 * PANDEMIC DIRECTIVE: ZERO HOUR
 */

// ==========================================
// 1. GAME STATE & ADVISORS
// ==========================================

const state = {
  day: 1,

  // PRIMARY STATS (0.0 to 1.0)
  population: 1.0,      
  economy: 0.80,        
  trust: 0.70,          
  
  // THREAT STATS
  infection: 0.05,      
  healthcare_load: 0.10, 

  // ADVISOR LOYALTY (0 to 100)
  advisors: {
    kael: 50, // General Kael: Prioritizes Order, Economy, Military
    aris: 50  // Dr. Aris: Prioritizes Life, Science, Truth
  },

  // NARRATIVE TRACKING
  arc: 'main', // 'main', 'riots', 'cure_race'
  arcProgress: 0,
  
  // SYSTEM FLAGS
  flags: {
    criticalMode: false, 
    lockdown: false,
    militarized: false,
    cure_progress: 0,
    sterility: false,
    kael_rebelled: false,
    aris_resigned: false
  },

  activeInterruption: null 
};

// ==========================================
// 2. UTILITY & MATH
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
  
  // Clamp Advisors
  state.advisors.kael = Math.max(0, Math.min(100, state.advisors.kael));
  state.advisors.aris = Math.max(0, Math.min(100, state.advisors.aris));
}

function noise(scale = 0.02) {
  return (Math.random() - 0.5) * scale;
}

// Adjust Advisor Loyalty
function modifyLoyalty(advisor, amount) {
  if (advisor === 'kael') {
    state.advisors.kael += amount;
    state.advisors.aris -= (amount / 2); // Rivalry
  } else if (advisor === 'aris') {
    state.advisors.aris += amount;
    state.advisors.kael -= (amount / 2);
  }
}

// ==========================================
// 3. SYSTEM DYNAMICS
// ==========================================

function runDailySimulation() {
  // --- INFECTION (Logistic Growth) ---
  let spreadRate = 0.15; 
  if (state.flags.lockdown) spreadRate -= 0.10;
  if (state.trust < 0.3) spreadRate += 0.05;
  if (state.healthcare_load > 0.9) spreadRate += 0.05; 
  
  // Endless Mode Scaling (Gets harder over time)
  if (state.day > 25) spreadRate += 0.02 * (state.day - 25);

  let growth = spreadRate * state.infection * (1 - state.infection);
  state.infection += growth + noise(0.01);

  // --- HEALTHCARE ---
  let targetLoad = state.infection * 1.2;
  state.healthcare_load += (targetLoad - state.healthcare_load) * 0.2;
  state.healthcare_load += 0.01;

  // --- ECONOMY ---
  let ecoDecay = 0.005;
  if (state.flags.lockdown) ecoDecay += 0.02;
  if (state.infection > 0.4) ecoDecay += 0.01;
  if (state.trust < 0.3) ecoDecay += 0.02;
  state.economy -= ecoDecay;

  // --- POPULATION ---
  let mortalityRate = 0.001; 
  mortalityRate += (state.infection * 0.01);
  if (state.healthcare_load > 0.95) mortalityRate += 0.02;
  state.population -= mortalityRate;

  // --- TRUST ---
  if (state.economy < 0.4) state.trust -= 0.01;
  if (state.population < 0.9) state.trust -= 0.01;

  // --- ADVISOR CHECK ---
  // If loyalty hits 0, major penalty
  if (state.advisors.kael <= 0 && !state.flags.kael_rebelled) {
    state.flags.kael_rebelled = true;
    state.trust -= 0.15;
    state.flags.militarized = false; // Army deserts
    triggerInterruption("COUP ATTEMPT", "General Kael has turned the military against you. Order is collapsing.", [
      { text: "Fight back (Civil War)", effect: (s) => { s.population -= 0.10; s.trust -= 0.10; } }
    ]);
  }
  
  if (state.advisors.aris <= 0 && !state.flags.aris_resigned) {
    state.flags.aris_resigned = true;
    state.healthcare_load += 0.20; // Doctors strike
    state.trust -= 0.10;
    triggerInterruption("MEDICAL STRIKE", "Dr. Aris has resigned in protest. Medical staff are walking out.", [
      { text: "Force them to work", effect: (s) => { s.trust -= 0.15; s.healthcare_load -= 0.05; } }
    ]);
  }

  normalizeState();
}

// ==========================================
// 4. SCENARIO & NARRATIVE ENGINE
// ==========================================

// --- NARRATIVE BRANCHES ---
const storyArcs = {
  // DEFAULT LINEAR PATH
  main: {
    1: {
      text: "DAY 1: PATIENT ZERO\nGeneral Kael wants to secure the area. Dr. Aris wants to treat patients.",
      choices: [
        {
          text: "[KAEL] Lockdown the sector. Suppress info.",
          effect: (s) => { s.infection -= 0.02; s.trust -= 0.05; modifyLoyalty('kael', 10); }
        },
        {
          text: "[ARIS] Declare emergency. Alert the public.",
          effect: (s) => { s.trust += 0.05; s.economy -= 0.05; modifyLoyalty('aris', 10); }
        }
      ]
    },
    5: {
      text: "DAY 5: CONTAINMENT BREACH\nThe virus has escaped the capital.",
      choices: [
        {
          text: "[KAEL] Total Lockdown. Shoot curfew breakers.",
          effect: (s) => { s.flags.lockdown = true; s.economy -= 0.10; s.infection -= 0.05; modifyLoyalty('kael', 15); }
        },
        {
          text: "[ARIS] Voluntary isolation and contact tracing.",
          effect: (s) => { s.infection += 0.08; s.trust += 0.05; modifyLoyalty('aris', 10); }
        }
      ]
    },
    10: {
      text: "DAY 10: RESOURCE CRISIS\nWe are running out of supplies.",
      choices: [
        {
          text: "[KAEL] Seize private assets.",
          effect: (s) => { s.economy -= 0.05; s.trust -= 0.10; modifyLoyalty('kael', 10); }
        },
        {
          text: "[ARIS] Request foreign aid (Debt).",
          effect: (s) => { s.economy -= 0.10; s.healthcare_load -= 0.10; modifyLoyalty('aris', 10); }
        }
      ]
    },
    15: {
      text: "DAY 15: THE VACCINE TRIALS\nDr. Aris believes she has a lead, but it requires dangerous testing.",
      choices: [
        {
          text: "[ARIS] Authorize human trials on prisoners.",
          effect: (s) => { s.flags.cure_progress += 30; s.trust -= 0.15; modifyLoyalty('aris', 15); }
        },
        {
          text: "[KAEL] Focus resources on walls and guns.",
          effect: (s) => { s.flags.militarized = true; s.infection -= 0.02; modifyLoyalty('kael', 10); }
        }
      ]
    },
    20: {
      text: "DAY 20: BREAKING POINT\nSociety is fracturing.",
      choices: [
        {
          text: "[KAEL] Martial Law. Suspend the constitution.",
          effect: (s) => { s.trust -= 0.20; s.economy += 0.05; modifyLoyalty('kael', 20); }
        },
        {
          text: "[ARIS] Form community support councils.",
          effect: (s) => { s.trust += 0.10; s.economy -= 0.10; modifyLoyalty('aris', 10); }
        }
      ]
    }
    // Days between these are procedurally filled if not defined
  },

  // BRANCH: RIOTS (Triggered by Trust < 0.3)
  riots: [
    {
      text: "ARC: CIVIL WAR - DAY 1\nThe streets are burning. The virus is secondary to the violence now.",
      choices: [
        { text: "[KAEL] Deploy tanks. Crush them.", effect: (s) => { s.population -= 0.05; s.trust -= 0.20; modifyLoyalty('kael', 10); } },
        { text: "Attempt to negotiate.", effect: (s) => { s.economy -= 0.10; s.trust += 0.05; } }
      ]
    },
    {
      text: "ARC: CIVIL WAR - DAY 2\nRebels have seized the power grid.",
      choices: [
        { text: "[KAEL] Storm the plant.", effect: (s) => { s.flags.militarized = true; s.economy -= 0.10; modifyLoyalty('kael', 10); } },
        { text: "[ARIS] Divert emergency power to hospitals.", effect: (s) => { s.healthcare_load -= 0.10; s.economy -= 0.20; modifyLoyalty('aris', 10); } }
      ]
    }
  ],

  // BRANCH: CURE RACE (Triggered by Cure Progress > 50)
  cure_race: [
    {
      text: "ARC: THE CURE - STAGE 1\nWe are close. We need massive compute power to finalize the formula.",
      choices: [
        { text: "[KAEL] Seize all bank servers.", effect: (s) => { s.economy -= 0.20; s.flags.cure_progress += 25; modifyLoyalty('kael', 10); } },
        { text: "[ARIS] Collaborate globally (Share data).", effect: (s) => { s.flags.cure_progress += 15; s.trust += 0.10; modifyLoyalty('aris', 10); } }
      ]
    },
    {
      text: "ARC: THE CURE - STAGE 2\nThe formula is ready. Production is the bottleneck.",
      choices: [
        { text: "[ARIS] Distribute raw formula to all labs.", effect: (s) => { s.flags.cure_progress = 100; s.infection -= 0.20; modifyLoyalty('aris', 20); } },
        { text: "[KAEL] Secure monopoly. Sell it.", effect: (s) => { s.economy += 0.50; s.trust -= 0.30; modifyLoyalty('kael', 20); } }
      ]
    }
  ]
};

// --- ENDLESS MODE GENERATOR ---
function generateEndlessScenario() {
  const templates = [
    {
      title: "VIRAL MUTATION",
      desc: "The virus has shifted. Immunity is dropping.",
      choices: [
        { text: "[ARIS] Rush new booster.", effect: (s) => { s.economy -= 0.10; s.infection -= 0.05; } },
        { text: "Ignore it.", effect: (s) => { s.infection += 0.15; } }
      ]
    },
    {
      title: "ECONOMIC CRASH",
      desc: "Markets are in freefall.",
      choices: [
        { text: "[KAEL] Austerity measures.", effect: (s) => { s.trust -= 0.10; s.economy += 0.10; } },
        { text: "Print money.", effect: (s) => { s.economy -= 0.15; s.trust += 0.05; } }
      ]
    },
    {
      title: "SUPPLY CHAIN FAILURE",
      desc: "Food is rotting in transit.",
      choices: [
        { text: "[KAEL] Military logistics.", effect: (s) => { s.flags.militarized = true; s.trust -= 0.05; } },
        { text: "Let people starve.", effect: (s) => { s.population -= 0.05; s.trust -= 0.15; } }
      ]
    }
  ];
  
  const template = templates[Math.floor(Math.random() * templates.length)];
  return {
    text: `SURVIVAL MODE: DAY ${state.day}\nEVENT: ${template.title}\n${template.desc}`,
    choices: template.choices
  };
}

// --- MAIN CONTENT FETCHING ---
function getDailyContent() {
  // 1. ENDLESS MODE
  if (state.day > 25) {
    return generateEndlessScenario();
  }

  // 2. CHECK FOR ARC TRIGGERS (If not already in one)
  if (state.arc === 'main') {
    if (state.trust < 0.30) state.arc = 'riots';
    if (state.flags.cure_progress > 50) state.arc = 'cure_race';
  }

  // 3. FETCH ARC CONTENT
  if (state.arc === 'riots') {
    if (storyArcs.riots[state.arcProgress]) {
      const scen = storyArcs.riots[state.arcProgress];
      state.arcProgress++; // Advance arc
      return scen;
    }
    // If arc runs out, return to main or endless?
    state.arc = 'main'; // Fallback
  }

  if (state.arc === 'cure_race') {
    if (storyArcs.cure_race[state.arcProgress]) {
      const scen = storyArcs.cure_race[state.arcProgress];
      state.arcProgress++;
      return scen;
    }
    state.arc = 'main';
  }

  // 4. MAIN TIMELINE (Fill gaps with generic events)
  if (storyArcs.main[state.day]) {
    return storyArcs.main[state.day];
  } else {
    // Generic filler for days 2, 3, 4 etc not defined in main
    return {
      text: `DAY ${state.day}: STATUS CHECK\nThe situation is evolving. Advisors await your command.`,
      choices: [
        { text: "[KAEL] Fortify Economy.", effect: (s) => { s.economy += 0.03; s.trust -= 0.02; modifyLoyalty('kael', 5); } },
        { text: "[ARIS] Boost Healthcare.", effect: (s) => { s.healthcare_load -= 0.05; s.economy -= 0.03; modifyLoyalty('aris', 5); } }
      ]
    };
  }
}

// ==========================================
// 5. INTERRUPTIONS & EVENTS
// ==========================================

function triggerInterruption(title, text, choices) {
  state.activeInterruption = { text: `*** ${title} ***\n${text}`, choices: choices };
}

function checkRandomInterruption() {
  if (state.day > 3 && Math.random() < 0.20 && !state.activeInterruption) {
    const events = [
      {
        title: "ADVISOR DISPUTE",
        text: "Kael and Aris are shouting in the war room.",
        choices: [
          { text: "Side with Kael.", effect: (s) => { modifyLoyalty('kael', 10); } },
          { text: "Side with Aris.", effect: (s) => { modifyLoyalty('aris', 10); } }
        ]
      },
      {
        title: "DATA LEAK",
        text: "True infection numbers have leaked.",
        choices: [
          { text: "Deny it.", effect: (s) => { s.trust -= 0.10; } },
          { text: "Confirm it.", effect: (s) => { s.trust += 0.05; s.economy -= 0.05; } }
        ]
      }
    ];
    const evt = events[Math.floor(Math.random() * events.length)];
    triggerInterruption(evt.title, evt.text, evt.choices);
  }
}

// ==========================================
// 6. ENDING CONDITIONS
// ==========================================

function checkEnding() {
  // Survival Mode Check
  if (state.day > 25) {
    if (state.population < 0.10) return "SURVIVAL MODE ENDED: EXTINCTION.";
    if (state.economy < 0.05) return "SURVIVAL MODE ENDED: TOTAL COLLAPSE.";
    return null; // Keep going
  }

  if (state.population < 0.15) return "ENDING: EXTINCTION.\nThe virus won.";
  if (state.economy < 0.20) return "ENDING: COLLAPSE.\nNation dissolved into anarchy.";
  if (state.trust < 0.15) return "ENDING: REVOLUTION.\nYou were dragged from the office.";
  if (state.healthcare_load >= 1.0 && state.infection > 0.50) return "ENDING: SYSTEM FAILURE.";
  
  return null;
}

// ==========================================
// 7. MAIN API
// ==========================================

function getStatusReport() {
  normalizeState();
  let loyaltyStr = `\nADVISORS: [KAEL: ${state.advisors.kael.toFixed(0)}%] [ARIS: ${state.advisors.aris.toFixed(0)}%]`;
  let modeStr = state.day > 25 ? " [SURVIVAL MODE]" : "";
  
  return `
STATUS REPORT - DAY ${state.day}${modeStr}
----------------------------
POPULATION: ${(state.population * 100).toFixed(1)}%
ECONOMY:    ${(state.economy * 100).toFixed(1)}%
TRUST:      ${(state.trust * 100).toFixed(1)}%
INFECTION:  ${(state.infection * 100).toFixed(1)}%
HOSPITALS:  ${(state.healthcare_load * 100).toFixed(1)}% Load${loyaltyStr}
----------------------------
`;
}

function advanceDay(choiceIndex = null) {
  let output = [];

  // 1. HANDLE INPUT
  if (choiceIndex !== null) {
    let currentChoices = [];
    if (state.activeInterruption) {
      currentChoices = state.activeInterruption.choices;
    } else {
      // Re-fetch the scenario logic to get the choices array
      // Note: This relies on the state NOT changing between display and input
      // Ideally we'd store the 'currentScenario' in state, but for this simple engine we re-fetch
      // CAUTION: Since getDailyContent() is state-dependent, we must ensure state hasn't shifted.
      // We will assume the UI passes index based on what was displayed.
      // We need to fetch the scenario *before* we simulate/advance.
      
      // To fix "re-fetching" issues with procedural gen, we should have stored it.
      // But for simplicity, we assume the user just saw the output of the PREVIOUS call.
      // Actually, we need to know what choices were offered. 
      // This architecture is slightly stateless. 
      // FIX: We will re-generate the logic of "what happens on this day" 
      // BUT, since procedural generation is random, we might get different choices!
      // CRITICAL FIX: We need to store 'currentScenario' in state.
    }

    // Since we didn't store it, we have to trust the flow. 
    // Ideally, the previous 'advanceDay' call set up the choices.
    // Let's assume we are executing the choice for the PREVIOUSLY displayed scenario.
    // We need to fetch the scenario object again.
    
    // To make this robust without rewriting the UI:
    // We will fetch `getDailyContent()` NOW to apply effect, THEN advance.
    // However, if it's random endless mode, calling it again gives new random choices.
    // We must store the current choices in state.
  }
  
  // FIX: Storing choices
  if (!state.currentScenario) {
    state.currentScenario = getDailyContent();
  }

  // VALIDATION & EXECUTION
  if (choiceIndex !== null) {
    let choices = state.activeInterruption ? state.activeInterruption.choices : state.currentScenario.choices;
    
    if (!choices[choiceIndex]) {
      return {
        text: ">> SYSTEM ALERT: Invalid Input. Focus.\n\n" + (state.activeInterruption ? state.activeInterruption.text : state.currentScenario.text),
        choices: choices.length,
        ended: false,
        critical: state.flags.criticalMode
      };
    }

    // Apply Effect
    output.push(`>> ACTION: ${choices[choiceIndex].text}`);
    choices[choiceIndex].effect(state);
    
    // Clear Interruption or Advance Day
    if (state.activeInterruption) {
      state.activeInterruption = null;
      // Don't advance day on interruption resolution
    } else {
      runDailySimulation();
      state.day++;
      // Generate NEW scenario for the NEXT day
      state.currentScenario = getDailyContent(); 
    }
  } else {
    // Initial Load
    state.currentScenario = getDailyContent();
  }

  // RED TEXT
  if (state.population < 0.70) state.flags.criticalMode = true;
  else if (state.population >= 0.75) state.flags.criticalMode = false;

  // CHECK ENDING
  const ending = checkEnding();
  if (ending) {
    output.push(getStatusReport());
    output.push("\n================================");
    output.push(ending);
    output.push("================================");
    return { text: output.join("\n"), choices: 0, ended: true, critical: state.flags.criticalMode };
  }

  // RANDOM INTERRUPTION? (Only if not already interrupted)
  if (!state.activeInterruption) {
    checkRandomInterruption();
  }

  // PREPARE OUTPUT
  output.push(getStatusReport());
  
  let scenarioDisplay = state.activeInterruption ? state.activeInterruption : state.currentScenario;
  
  output.push(scenarioDisplay.text);
  output.push("");
  scenarioDisplay.choices.forEach((c, i) => {
    output.push(`[${i + 1}] ${c.text}`);
  });

  return {
    text: output.join("\n"),
    choices: scenarioDisplay.choices.length,
    ended: false,
    critical: state.flags.criticalMode
  };
}
