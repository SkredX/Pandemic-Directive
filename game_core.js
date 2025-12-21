/**
 * PANDEMIC DIRECTIVE: ZERO HOUR
 * CORE LOGIC - REVISED (HARDCORE MODE)
 */

// ==========================================
// 1. GAME STATE
// ==========================================

const state = {
  day: 1,

  // PRIMARY STATS (0.0 to 1.0)
  // Rebalanced: Easier to lose, harder to maintain.
  population: 1.0,      
  economy: 0.80,        
  trust: 0.70,          
  
  // THREAT STATS
  infection: 0.05,      
  healthcare_load: 0.10, 

  // SYSTEM FLAGS
  flags: {
    criticalMode: false, // Now triggers at 70%
    lockdown: false,
    militarized: false,
    cure_progress: 0,
    sterility: false
  },

  // INTERRUPTION SYSTEM
  // Stores a random event if one triggers, pausing the main timeline
  activeInterruption: null 
};

// ==========================================
// 2. UTILITY & MATH
// ==========================================

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function noise(scale = 0.04) {
  return (Math.random() - 0.5) * scale;
}

// ==========================================
// 3. SYSTEM DYNAMICS (The Math Engine)
// ==========================================

function runDailySimulation() {
  // 1. INFECTION SPREAD
  // significantly more aggressive
  let viralGrowth = 1.15; 
  if (state.trust < 0.4) viralGrowth += 0.08; // Distrust = chaos
  if (state.flags.lockdown) viralGrowth -= 0.12;
  
  // If hospitals are full, spread accelerates (hospitals become vectors)
  if (state.healthcare_load > 0.9) viralGrowth += 0.05; 

  state.infection = state.infection * viralGrowth;
  state.infection += noise(0.02);

  // 2. HEALTHCARE LOAD
  // Increases sharply with infection
  state.healthcare_load += (state.infection * 0.50); 
  state.healthcare_load += 0.02; // Base daily strain

  // 3. ECONOMY
  // Decays much faster now
  let ecoDecay = 0.03; // Higher base decay
  if (state.infection > 0.25) ecoDecay += 0.04; // Sick workforce
  if (state.flags.lockdown) ecoDecay += 0.05; // Lockdown kills economy
  if (state.trust < 0.3) ecoDecay += 0.05; // Riots kill economy
  
  state.economy -= ecoDecay;

  // 4. POPULATION
  // Mortality is higher.
  let deathRate = state.infection * 0.05; // Base death rate increased
  
  // If healthcare collapses, death rate skyrockets
  if (state.healthcare_load > 0.95) {
    deathRate *= 5.0; 
  } else if (state.healthcare_load > 0.8) {
    deathRate *= 2.0;
  }
  
  state.population -= deathRate;

  // 5. PUBLIC TRUST
  // Very volatile
  state.trust -= 0.02; // Natural cynicism
  if (state.economy < 0.4) state.trust -= 0.03;
  if (state.population < 0.8) state.trust -= 0.05; // Panic due to deaths

  // --- CLAMP VALUES ---
  state.infection = clamp(state.infection);
  state.population = clamp(state.population);
  state.economy = clamp(state.economy);
  state.healthcare_load = clamp(state.healthcare_load);
  state.trust = clamp(state.trust);
}

// ==========================================
// 4. RANDOM SUDDEN EVENTS (New Feature)
// ==========================================
// These can trigger between days to cause massive damage.

const randomEvents = [
  {
    id: 'mutation_spike',
    text: "CRITICAL ALERT: VIRAL MUTATION DETECTED\nThe pathogen has shifted. It is bypassing current containment protocols. Infection rates are doubling hourly.",
    choices: [
      {
        text: "Emergency Total Lockdown (Crush Economy).",
        effect: (s) => {
          s.economy -= 0.25; // Massive Hit
          s.infection -= 0.10;
          s.trust -= 0.15;
          s.flags.lockdown = true;
        }
      },
      {
        text: "Let it burn (Save Economy).",
        effect: (s) => {
          s.infection += 0.30; // Massive Spike
          s.population -= 0.10; // Immediate deaths
          s.trust -= 0.20;
        }
      }
    ]
  },
  {
    id: 'civil_war',
    text: "CRITICAL ALERT: MASS INSURRECTION\nCitizens have stormed the capital. They are burning government buildings. The grid is at risk.",
    choices: [
      {
        text: "Deploy Live Ammunition (Massacre).",
        effect: (s) => {
          s.population -= 0.15; // Direct kills
          s.trust = 0.05; // Trust destroyed
          s.flags.militarized = true;
          s.economy += 0.05; // Order restored
        }
      },
      {
        text: "Flee the Capital (Anarchy).",
        effect: (s) => {
          s.economy -= 0.30;
          s.trust += 0.10;
          s.healthcare_load += 0.20;
        }
      }
    ]
  },
  {
    id: 'foreign_pressure',
    text: "CRITICAL ALERT: GLOBAL SANCTIONS\nThe UN has declared us a 'Bio-Hazard State'. All imports (food/medicine) are blocked.",
    choices: [
      {
        text: "Seize all private assets to survive.",
        effect: (s) => {
          s.economy += 0.20;
          s.trust -= 0.30;
          s.population -= 0.05; // Starvation
        }
      },
      {
        text: "Beg for mercy (Open borders for inspection).",
        effect: (s) => {
          s.trust -= 0.10;
          s.infection += 0.20; // Re-infection from inspectors
          s.economy -= 0.10;
        }
      }
    ]
  }
];

function triggerRandomEvent() {
  // 25% chance of a random disaster if day > 3
  if (state.day > 3 && state.day < 24 && Math.random() < 0.25) {
    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    return event;
  }
  return null;
}

// ==========================================
// 5. SCENARIO ENGINE (Days 1-25)
// ==========================================

const scenarios = {
  1: {
    text: "DAY 1: PATIENT ZERO\nReports indicate a novel pathogen in the capital. Mortality rate is estimated at 15%. This is not the flu.",
    choices: [
      {
        text: "Suppress information to protect markets.",
        effect: (s) => {
          s.economy += 0.05; 
          s.infection += 0.15; // Huge initial spread
          s.trust -= 0.10;
        }
      },
      {
        text: "Declare National Emergency.",
        effect: (s) => {
          s.economy -= 0.15; // Immediate recession
          s.trust += 0.05; 
          s.healthcare_load -= 0.05;
        }
      }
    ]
  },
  2: {
    text: "DAY 2: BORDER CLOSURE\nRefugees are fleeing. Neighboring nations are building walls.",
    choices: [
      {
        text: "Close borders with military force.",
        effect: (s) => {
          s.economy -= 0.20; // Trade collapse
          s.infection -= 0.05; 
          s.trust += 0.05;
        }
      },
      {
        text: "Keep trade routes open.",
        effect: (s) => {
          s.economy += 0.05;
          s.infection += 0.15; // Virus pours in
        }
      }
    ]
  },
  3: {
    text: "DAY 3: THE WHISTLEBLOWER\nA doctor leaked footage of body bags piling up. The public is terrified.",
    choices: [
      {
        text: "Execute the whistleblower for treason.",
        effect: (s) => {
          s.trust -= 0.25; // Massive anger
          s.economy += 0.05; // Order enforced
        }
      },
      {
        text: "Admit the truth.",
        effect: (s) => {
          s.trust += 0.15;
          s.economy -= 0.10; // Panic selling
        }
      }
    ]
  },
  4: {
    text: "DAY 4: EQUIPMENT SHORTAGE\nVentilators are gone. People are dying in corridors.",
    choices: [
      {
        text: "Seize private factories (Nationalization).",
        effect: (s) => {
          s.economy -= 0.15;
          s.healthcare_load -= 0.20; // Big relief
        }
      },
      {
        text: "Let the weak die.",
        effect: (s) => {
          s.population -= 0.10; // 10% die instantly
          s.economy += 0.10; // Resources saved
          s.trust -= 0.20;
        }
      }
    ]
  },
  5: {
    text: "DAY 5: TOTAL LOCKDOWN\nAdvisors beg for a total shutdown of society.",
    choices: [
      {
        text: "Enforce Martial Law Lockdown.",
        effect: (s) => {
          s.economy -= 0.30; // CRASH
          s.infection -= 0.20; 
          s.flags.lockdown = true;
        }
      },
      {
        text: "Keep the country open for business.",
        effect: (s) => {
          s.economy += 0.10;
          s.infection += 0.25; // Massive spread
          s.population -= 0.05;
        }
      }
    ]
  },
  6: {
    text: "DAY 6: FOOD RIOTS\nSupply chains have snapped. The poor are starving.",
    choices: [
      {
        text: "Military rationing (Shoot looters).",
        effect: (s) => {
          s.population -= 0.05;
          s.trust -= 0.20;
          s.flags.militarized = true;
        }
      },
      {
        text: "Let them loot.",
        effect: (s) => {
          s.economy -= 0.20;
          s.trust -= 0.10;
          s.infection += 0.10; // Crowds spread virus
        }
      }
    ]
  },
  7: {
    text: "DAY 7: RELIGIOUS FERVOR\nCults are claiming the virus is divine judgement. They refuse treatment.",
    choices: [
      {
        text: "Raid their compounds.",
        effect: (s) => {
          s.trust -= 0.15;
          s.population -= 0.02; // Violence
          s.infection -= 0.05;
        }
      },
      {
        text: "Ignore them.",
        effect: (s) => {
          s.infection += 0.15; // They become super-spreaders
          s.healthcare_load += 0.10;
        }
      }
    ]
  },
  8: {
    text: "DAY 8: THE DEATH PANELS\nHospitals are at 200% capacity. We must choose who gets treatment.",
    choices: [
      {
        text: "Treat only the workforce (18-50).",
        effect: (s) => {
          s.population -= 0.15; // Elderly/Kids die
          s.economy += 0.10;
          s.trust -= 0.20;
        }
      },
      {
        text: "Lottery system.",
        effect: (s) => {
          s.population -= 0.08;
          s.healthcare_load += 0.20; // System breaks
          s.trust += 0.05;
        }
      }
    ]
  },
  9: {
    text: "DAY 9: BANK RUNS\nEveryone is withdrawing cash. Banks are collapsing.",
    choices: [
      {
        text: "Freeze all assets.",
        effect: (s) => {
          s.economy += 0.10; // Saved for now
          s.trust -= 0.30; // Fury
        }
      },
      {
        text: "Print money (Hyperinflation).",
        effect: (s) => {
          s.economy -= 0.25; // Worthless currency
          s.trust -= 0.10;
        }
      }
    ]
  },
  10: {
    text: "DAY 10: MISINFORMATION\nRumors say the government created the virus.",
    choices: [
      {
        text: "Shut down the internet.",
        effect: (s) => {
          s.trust -= 0.20;
          s.economy -= 0.15; // Tech crash
          s.infection -= 0.05;
        }
      },
      {
        text: "Ignore the rumors.",
        effect: (s) => {
          s.trust -= 0.15;
          s.population -= 0.05; // People drink bleach
        }
      }
    ]
  },
  11: {
    text: "DAY 11: A NEW SYMPTOM\nVictims are now going blind before dying. Panic is total.",
    choices: [
      {
        text: "Hide this data.",
        effect: (s) => {
          s.trust += 0.05;
          s.infection += 0.20; // Unprepared
        }
      },
      {
        text: "Broadcast warnings.",
        effect: (s) => {
          s.trust -= 0.15;
          s.economy -= 0.10;
        }
      }
    ]
  },
  12: {
    text: "DAY 12: MILITARY DESERTION\nSoldiers are abandoning posts to protect their families.",
    choices: [
      {
        text: "Execute deserters publicly.",
        effect: (s) => {
          s.trust -= 0.30;
          s.flags.militarized = true;
          s.population -= 0.01;
        }
      },
      {
        text: "Offer double pay.",
        effect: (s) => {
          s.economy -= 0.20; // Treasure emptied
          s.trust += 0.10;
        }
      }
    ]
  },
  13: {
    text: "DAY 13: THE ELITE\nThe billionaire class demands evacuation to a private island.",
    choices: [
      {
        text: "Let them go (Take their money).",
        effect: (s) => {
          s.economy += 0.30;
          s.trust -= 0.40; // Class war
        }
      },
      {
        text: "Confiscate their jets for medical transport.",
        effect: (s) => {
          s.healthcare_load -= 0.15;
          s.economy -= 0.30; // Capital flight
          s.trust += 0.20;
        }
      }
    ]
  },
  14: {
    text: "DAY 14: CORNER CUTTING\nWe can speed up a vaccine by testing on prisoners.",
    choices: [
      {
        text: "Authorize human experimentation.",
        effect: (s) => {
          s.flags.cure_progress += 60;
          s.trust -= 0.25;
          s.population -= 0.02;
        }
      },
      {
        text: "Maintain ethics.",
        effect: (s) => {
          s.population -= 0.10; // Delay kills
          s.trust += 0.05;
        }
      }
    ]
  },
  15: {
    text: "DAY 15: MASS GRAVES\nWe ran out of space. The bodies are rotting in the streets.",
    choices: [
      {
        text: "Burn them in the streets.",
        effect: (s) => {
          s.trust -= 0.20;
          s.infection -= 0.10;
          s.economy -= 0.05;
        }
      },
      {
        text: "Dump them in the river.",
        effect: (s) => {
          s.infection += 0.20; // Water contamination
          s.trust -= 0.10;
        }
      }
    ]
  },
  16: {
    text: "DAY 16: ECONOMIC COLLAPSE\nMoney is now meaningless. We need a barter system.",
    choices: [
      {
        text: "Nationalize all food and fuel.",
        effect: (s) => {
          s.economy = 0.40; // Hard reset
          s.trust -= 0.15;
          s.flags.lockdown = true;
        }
      },
      {
        text: "Let anarchy reign.",
        effect: (s) => {
          s.economy = 0.05; // Collapse
          s.population -= 0.10; // Starvation
        }
      }
    ]
  },
  17: {
    text: "DAY 17: THE SEPARATION\nThe infected North can be cut off from the clean South.",
    choices: [
      {
        text: "Blow the bridges. Abandon the North.",
        effect: (s) => {
          s.population -= 0.35; // Huge loss
          s.infection -= 0.40; // Contained
          s.trust -= 0.50; // We killed our own
        }
      },
      {
        text: "Try to save everyone.",
        effect: (s) => {
          s.infection += 0.20;
          s.healthcare_load += 0.30; // Overload
        }
      }
    ]
  },
  18: {
    text: "DAY 18: HOSTILE TAKEOVER\nA neighbor state is invading to 'secure' our bio-labs.",
    choices: [
      {
        text: "Surrender.",
        effect: (s) => {
          s.trust -= 0.40; // Nation is gone
          s.economy += 0.10;
          s.healthcare_load -= 0.20;
        }
      },
      {
        text: "Total War.",
        effect: (s) => {
          s.population -= 0.20; // War casualties
          s.economy -= 0.20;
          s.flags.militarized = true;
        }
      }
    ]
  },
  19: {
    text: "DAY 19: THE CURE?\nOne child is immune. To make the cure, we must harvest all their organs.",
    choices: [
      {
        text: "Kill the child. Save the world.",
        effect: (s) => {
          s.flags.cure_progress = 100;
          s.infection -= 0.30;
          s.trust -= 0.40; // Monster
        }
      },
      {
        text: "Spare the child.",
        effect: (s) => {
          s.infection += 0.10;
          s.population -= 0.10;
        }
      }
    ]
  },
  20: {
    text: "DAY 20: DARKNESS\nThe power grid has finally failed.",
    choices: [
      {
        text: "Divert all remaining fuel to military.",
        effect: (s) => {
          s.flags.militarized = true;
          s.healthcare_load += 0.50; // Hospitals go dark
          s.trust -= 0.20;
        }
      },
      {
        text: "Divert fuel to hospitals.",
        effect: (s) => {
          s.healthcare_load -= 0.20;
          s.economy -= 0.30; // Industry dies
        }
      }
    ]
  },
  21: {
    text: "DAY 21: THE ARK\nThere is a bunker for 10,000 people. Who goes?",
    choices: [
      {
        text: "Scientists and Engineers.",
        effect: (s) => {
          s.trust -= 0.20;
          s.economy += 0.05; // Future hope
        }
      },
      {
        text: "Random Lottery.",
        effect: (s) => {
          s.trust += 0.10;
          s.economy -= 0.10;
        }
      }
    ]
  },
  22: {
    text: "DAY 22: DATA LOSS\nWe no longer know who is infected.",
    choices: [
      {
        text: "Assume everyone is infected.",
        effect: (s) => {
          s.trust -= 0.20;
          s.population -= 0.05;
        }
      },
      {
        text: "Lift restrictions and pray.",
        effect: (s) => {
          s.infection += 0.30;
          s.economy += 0.10;
        }
      }
    ]
  },
  23: {
    text: "DAY 23: STERILIZATION\nWe can gas the cities. Kills the virus, sterilizes the humans.",
    choices: [
      {
        text: "Do it. End the plague.",
        effect: (s) => {
          s.infection = 0.0;
          s.flags.sterility = true;
          s.trust -= 0.50;
        }
      },
      {
        text: "No. There must be another way.",
        effect: (s) => {
          s.population -= 0.15;
        }
      }
    ]
  },
  24: {
    text: "DAY 24: THE ENDGAME\nThe government has fallen. You are the only authority left.",
    choices: [
      {
        text: "Establish a dictatorship.",
        effect: (s) => {
          s.trust = 0.10;
          s.economy += 0.10; // Forced labor
        }
      },
      {
        text: "Disband and go home.",
        effect: (s) => {
          s.trust += 0.20;
          s.economy = 0.0;
        }
      }
    ]
  },
  25: {
    text: "DAY 25: ZERO HOUR\nThe dust settles. What remains?",
    choices: [
      {
        text: "Look at the horizon.",
        effect: (s) => {
          // Final Stat Adjustment
          s.trust += 0.05;
        }
      }
    ]
  }
};

// ==========================================
// 6. ENDING CONDITIONS (Revised Probabilities)
// ==========================================

function checkEnding() {
  if (state.day < 16) return null;

  // 1. EXTINCTION (Population < 15%)
  if (state.population < 0.15) {
    return "ENDING: HUMAN EXTINCTION.\nThere is no one left to bury the dead. The virus won.";
  }

  // 2. SOCIETAL COLLAPSE (Economy < 20%)
  if (state.economy < 0.20) {
    return "ENDING: COUNTRY COLLAPSE.\nThe nation dissolves into warring tribes. Starvation claims those the virus missed.";
  }

  // 3. GENERATIONAL TRAUMA (Trust < 20%)
  if (state.trust < 0.20) {
    return "ENDING: GENERATIONAL TRAUMA.\nThe government falls. The virus is contained, but the survivors will never trust authority again.";
  }

  // 4. BIOLOGICAL CASCADE (Healthcare 100% & Infection > 50%)
  if (state.healthcare_load >= 1.0 && state.infection > 0.50) {
    return "ENDING: EXTINCTION (CASCADING FAILURE).\nHospitals became incubation centers. The viral load is too high for species survival.";
  }

  // 5. CONTROLLED ERADICATION (Win State - Very Hard)
  if (
    state.population > 0.40 &&
    state.economy > 0.30 &&
    state.trust > 0.50 &&
    state.infection < 0.10
  ) {
    return "ENDING: CONTROLLED ERADICATION.\nWe have survived. The cost was high, but humanity endures with its soul intact.";
  }

  // 6. HARD STOP (Day 26)
  if (state.day > 25) {
    return "ENDING: UNCERTAIN FUTURE.\nThe worst is over. The survivors emerge into a quiet, broken world.";
  }

  return null;
}

// ==========================================
// 7. MAIN GAME LOOP API
// ==========================================

function getStatusReport() {
  return `
STATUS REPORT - DAY ${state.day}
----------------------------
POPULATION: ${(state.population * 100).toFixed(1)}%
ECONOMY:    ${(state.economy * 100).toFixed(1)}%
TRUST:      ${(state.trust * 100).toFixed(1)}%
INFECTION:  ${(state.infection * 100).toFixed(1)}%
HOSPITALS:  ${(state.healthcare_load * 100).toFixed(1)}% Load
----------------------------
`;
}

function advanceDay(choiceIndex = null) {
  let output = [];

  // --- INPUT VALIDATION (EDGE CASE CHECKER) ---
  // If we are waiting for input (choiceIndex is not null)
  // and the choice is invalid, return the strict error message.
  if (choiceIndex !== null) {
    
    // Check if there was an active interruption
    if (state.activeInterruption) {
      if (!state.activeInterruption.choices[choiceIndex]) {
         return {
          text: ">> SYSTEM ALERT: This is not the time to fool around, agent. You hold a lot more power than you see. Focus.\n\n" + state.activeInterruption.text + "\n\n" + state.activeInterruption.choices.map((c, i) => `[${i+1}] ${c.text}`).join('\n'),
          choices: state.activeInterruption.choices.length,
          ended: false,
          critical: state.flags.criticalMode
        };
      }
    } 
    // Check normal scenario
    else {
      const currentScen = scenarios[state.day];
      if (!currentScen || !currentScen.choices[choiceIndex]) {
        return {
          text: ">> SYSTEM ALERT: This is not the time to fool around, agent. You hold a lot more power than you see. Focus.\n\n" + currentScen.text + "\n\n" + currentScen.choices.map((c, i) => `[${i+1}] ${c.text}`).join('\n'),
          choices: currentScen.choices.length,
          ended: false,
          critical: state.flags.criticalMode
        };
      }
    }
  }

  // --- PROCESSING THE TURN ---

  // 1. Handle Interruption Choice (If one was active)
  if (state.activeInterruption && choiceIndex !== null) {
    output.push(`>> ACTION: ${state.activeInterruption.choices[choiceIndex].text}`);
    state.activeInterruption.choices[choiceIndex].effect(state);
    state.activeInterruption = null; // Clear event
    // Do NOT increment day yet. The interruption happens "during" the gap.
    // We proceed to show the normal day now.
  } 
  // 2. Handle Normal Scenario Choice
  else if (choiceIndex !== null) {
    const scenario = scenarios[state.day];
    output.push(`>> ACTION: ${scenario.choices[choiceIndex].text}`);
    scenario.choices[choiceIndex].effect(state);
    
    // Run Simulation & Advance Day
    runDailySimulation();
    state.day++;
  }

  // --- RED TEXT LOGIC (UPDATED to 70% / 75%) ---
  if (state.population < 0.70) {
    state.flags.criticalMode = true;
  } else if (state.population >= 0.75) {
    state.flags.criticalMode = false;
  }

  // --- CHECK ENDING ---
  const ending = checkEnding();
  if (ending) {
    output.push(getStatusReport());
    output.push("\n================================");
    output.push(ending);
    output.push("================================");
    return {
      text: output.join("\n"),
      choices: 0,
      ended: true,
      critical: state.flags.criticalMode
    };
  }

  // --- TRIGGER NEW INTERRUPTION? ---
  // If we haven't already processed an interruption this turn...
  // Check for a new random sudden event.
  const suddenEvent = triggerRandomEvent();
  if (suddenEvent) {
    state.activeInterruption = suddenEvent;
    output.push(getStatusReport());
    output.push("\n*** INTERRUPTION ***");
    output.push(suddenEvent.text);
    output.push("");
    suddenEvent.choices.forEach((c, i) => {
      output.push(`[${i + 1}] ${c.text}`);
    });

    return {
      text: output.join("\n"),
      choices: suddenEvent.choices.length,
      ended: false,
      critical: state.flags.criticalMode
    };
  }

  // --- NORMAL DAY DISPLAY ---
  output.push(getStatusReport());
  const nextScenario = scenarios[state.day];

  if (nextScenario) {
    output.push(nextScenario.text);
    output.push("");
    nextScenario.choices.forEach((c, i) => {
      output.push(`[${i + 1}] ${c.text}`);
    });
    
    return {
      text: output.join("\n"),
      choices: nextScenario.choices.length,
      ended: false,
      critical: state.flags.criticalMode
    };
  } else {
    // Catch-all end
    return {
      text: "Signal lost...",
      choices: 0,
      ended: true,
      critical: state.flags.criticalMode
    };
  }
}
