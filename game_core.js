/**
 * PANDEMIC DIRECTIVE: ZERO HOUR
 * CORE LOGIC - BALANCED & BOUNDED
 */

// ==========================================
// 1. GAME STATE
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

  // SYSTEM FLAGS
  flags: {
    criticalMode: false, // Triggers Red Text at < 70%
    lockdown: false,
    militarized: false,
    cure_progress: 0,
    sterility: false
  },

  activeInterruption: null 
};

// ==========================================
// 2. UTILITY & MATH
// ==========================================

// Hard clamp to ensure no 130% or -10% bugs
function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function normalizeState() {
  state.population = clamp(state.population);
  state.economy = clamp(state.economy);
  state.trust = clamp(state.trust);
  state.infection = clamp(state.infection);
  state.healthcare_load = clamp(state.healthcare_load);
}

function noise(scale = 0.02) {
  return (Math.random() - 0.5) * scale;
}

// ==========================================
// 3. SYSTEM DYNAMICS (The Balanced Math Engine)
// ==========================================

function runDailySimulation() {
  // 1. INFECTION SPREAD (LOGISTIC GROWTH)
  // This prevents infection from exceeding 100% naturally.
  // Growth slows down as it reaches saturation.
  let spreadRate = 0.15; // Base spread speed
  
  // Modifiers
  if (state.flags.lockdown) spreadRate -= 0.10; // Lockdowns work
  if (state.trust < 0.3) spreadRate += 0.05; // Distrust spreads virus
  if (state.healthcare_load > 0.9) spreadRate += 0.05; // Full hospitals spread virus
  
  // Logistic Formula: New = Old + (Rate * Old * (1 - Old))
  let growth = spreadRate * state.infection * (1 - state.infection);
  state.infection += growth;
  
  // Add minor randomness
  state.infection += noise(0.01);

  // 2. HEALTHCARE LOAD
  // Follows infection but lags slightly
  let targetLoad = state.infection * 1.2; // Hospitals feel 1.2x the pressure of infection
  // Move current load towards target load smoothly (10% per day)
  state.healthcare_load += (targetLoad - state.healthcare_load) * 0.2;
  state.healthcare_load += 0.01; // Base fatigue

  // 3. ECONOMY
  // Reduced decay. Only crashes if infection/unrest is high.
  let ecoDecay = 0.005; // Very slow base decay (0.5%)
  
  if (state.flags.lockdown) ecoDecay += 0.02; // Lockdowns hurt (2%)
  if (state.infection > 0.4) ecoDecay += 0.01; // Sick workforce
  if (state.trust < 0.3) ecoDecay += 0.02; // Riots
  
  state.economy -= ecoDecay;

  // 4. POPULATION
  // Deaths are rare early on, ramping up only if overwhelmed.
  let mortalityRate = 0.001; // Base natural mortality
  
  // Infection kills based on spread
  mortalityRate += (state.infection * 0.01);
  
  // Collapse Modifier: If hospitals are full, people die much faster
  if (state.healthcare_load > 0.95) {
    mortalityRate += 0.02; // +2% population loss per day (Severe)
  }
  
  state.population -= mortalityRate;

  // 5. PUBLIC TRUST
  // Decays if things go bad.
  if (state.economy < 0.4) state.trust -= 0.01;
  if (state.population < 0.9) state.trust -= 0.01;
  if (state.infection > 0.5) state.trust -= 0.01;

  // Final Safety Check
  normalizeState();
}

// ==========================================
// 4. RANDOM SUDDEN EVENTS (Interruptions)
// ==========================================

const randomEvents = [
  {
    id: 'mutation_spike',
    text: "ALERT: VIRAL MUTATION DETECTED\nThe pathogen has shifted. Current protocols are failing.",
    choices: [
      {
        text: "Emergency Protocols (Slows virus, hurts economy).",
        effect: (s) => {
          s.economy -= 0.05; 
          s.infection -= 0.05;
        }
      },
      {
        text: "Maintain Course.",
        effect: (s) => {
          s.infection += 0.08; 
        }
      }
    ]
  },
  {
    id: 'civil_unrest',
    text: "ALERT: CIVIL UNREST\nProtests are erupting in major cities.",
    choices: [
      {
        text: "Pacify with Aid (Costs money).",
        effect: (s) => {
          s.economy -= 0.05;
          s.trust += 0.05;
        }
      },
      {
        text: "Deploy Police.",
        effect: (s) => {
          s.trust -= 0.08;
          s.flags.militarized = true;
        }
      }
    ]
  }
];

function triggerRandomEvent() {
  // 30% chance of interruption between days 5 and 22
  if (state.day > 5 && state.day < 22 && Math.random() < 0.30) {
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
    text: "DAY 1: PATIENT ZERO\nReports indicate a novel pathogen in the capital. Mortality rate is estimated at 5%.",
    choices: [
      {
        text: "Suppress information to protect markets.",
        effect: (s) => {
          s.economy += 0.02; 
          s.infection += 0.05; 
          s.trust -= 0.02;
        }
      },
      {
        text: "Declare National Emergency.",
        effect: (s) => {
          s.economy -= 0.05; 
          s.trust += 0.05; 
          s.healthcare_load -= 0.02;
        }
      }
    ]
  },
  2: {
    text: "DAY 2: BORDER CONTROL\nNeighboring nations are watching.",
    choices: [
      {
        text: "Close borders (Hits Economy).",
        effect: (s) => {
          s.economy -= 0.05;
          s.infection -= 0.02; 
          s.trust += 0.02;
        }
      },
      {
        text: "Keep trade routes open.",
        effect: (s) => {
          s.economy += 0.02;
          s.infection += 0.05;
        }
      }
    ]
  },
  3: {
    text: "DAY 3: THE LEAK\nFootage of body bags is circulating online.",
    choices: [
      {
        text: "Censor the internet.",
        effect: (s) => {
          s.trust -= 0.10; 
          s.economy += 0.02;
        }
      },
      {
        text: "Address the nation honestly.",
        effect: (s) => {
          s.trust += 0.05;
          s.economy -= 0.03; // Panic selling
        }
      }
    ]
  },
  4: {
    text: "DAY 4: EQUIPMENT SHORTAGE\nHospitals need ventilators.",
    choices: [
      {
        text: "Nationalize Factories (Force production).",
        effect: (s) => {
          s.economy -= 0.05;
          s.healthcare_load -= 0.10; 
        }
      },
      {
        text: "Import at high cost.",
        effect: (s) => {
          s.economy -= 0.10;
          s.healthcare_load -= 0.05;
        }
      }
    ]
  },
  5: {
    text: "DAY 5: CONTAINMENT STRATEGY\nInfection is spreading beyond the capital.",
    choices: [
      {
        text: "Total Lockdown (Drastic Economic Impact).",
        effect: (s) => {
          s.economy -= 0.10; 
          s.infection -= 0.08; 
          s.flags.lockdown = true;
        }
      },
      {
        text: "Advisory warnings only.",
        effect: (s) => {
          s.infection += 0.08; 
          s.trust += 0.02;
        }
      }
    ]
  },
  6: {
    text: "DAY 6: SUPPLY CHAINS\nSupermarkets are emptying.",
    choices: [
      {
        text: "Ration food (Military distribution).",
        effect: (s) => {
          s.trust -= 0.05;
          s.flags.militarized = true;
          s.population += 0.01; // Saves lives
        }
      },
      {
        text: "Let the market adjust.",
        effect: (s) => {
          s.economy += 0.02;
          s.trust -= 0.05; // Poor starve
          s.population -= 0.01;
        }
      }
    ]
  },
  7: {
    text: "DAY 7: RELIGIOUS GATHERING\nA major festival is approaching.",
    choices: [
      {
        text: "Ban the gathering.",
        effect: (s) => {
          s.trust -= 0.08;
          s.infection -= 0.03;
        }
      },
      {
        text: "Allow it.",
        effect: (s) => {
          s.infection += 0.10; // Spreader event
          s.healthcare_load += 0.05;
        }
      }
    ]
  },
  8: {
    text: "DAY 8: TRIAGE\nHospitals are filling up.",
    choices: [
      {
        text: "Prioritize the young (Turn away elderly).",
        effect: (s) => {
          s.healthcare_load -= 0.10;
          s.population -= 0.02;
          s.trust -= 0.10;
        }
      },
      {
        text: "First come, first served.",
        effect: (s) => {
          s.healthcare_load += 0.10;
          s.trust += 0.02;
        }
      }
    ]
  },
  9: {
    text: "DAY 9: CORPORATE BAILOUT\nAirlines are bankrupt.",
    choices: [
      {
        text: "Bail them out (Print money).",
        effect: (s) => {
          s.economy += 0.08;
          s.trust -= 0.05;
        }
      },
      {
        text: "Let them fail.",
        effect: (s) => {
          s.economy -= 0.10;
          s.trust += 0.02;
        }
      }
    ]
  },
  10: {
    text: "DAY 10: DISINFORMATION\nFake cures are killing people.",
    choices: [
      {
        text: "Aggressive censorship.",
        effect: (s) => {
          s.trust -= 0.05;
          s.infection -= 0.02;
        }
      },
      {
        text: "Public education campaign (Slow).",
        effect: (s) => {
          s.population -= 0.01;
          s.trust += 0.02;
        }
      }
    ]
  },
  11: {
    text: "DAY 11: A NEW SYMPTOM\nThe virus is causing blindness in rare cases.",
    choices: [
      {
        text: "Hide the data to prevent panic.",
        effect: (s) => {
          s.trust += 0.02;
          s.infection += 0.05; // Less caution taken
        }
      },
      {
        text: "Announce it.",
        effect: (s) => {
          s.trust -= 0.05;
          s.economy -= 0.03;
        }
      }
    ]
  },
  12: {
    text: "DAY 12: POLICE STRIKE\nOfficers are refusing to work without Hazmat gear.",
    choices: [
      {
        text: "Divert medical supplies to police.",
        effect: (s) => {
          s.trust -= 0.05;
          s.healthcare_load += 0.05; // Hospitals lose gear
          s.economy += 0.02; // Order restored
        }
      },
      {
        text: "Deploy the Army instead.",
        effect: (s) => {
          s.flags.militarized = true;
          s.trust -= 0.10;
        }
      }
    ]
  },
  13: {
    text: "DAY 13: THE ELITE\nBillionaires are fleeing to private islands.",
    choices: [
      {
        text: "Tax their exit (Seize assets).",
        effect: (s) => {
          s.economy += 0.10;
          s.trust += 0.05;
        }
      },
      {
        text: "Let them go.",
        effect: (s) => {
          s.economy -= 0.05;
          s.trust -= 0.05;
        }
      }
    ]
  },
  14: {
    text: "DAY 14: VACCINE TRIALS\nWe can rush testing.",
    choices: [
      {
        text: "Test on prisoners (Unethical).",
        effect: (s) => {
          s.flags.cure_progress += 50;
          s.trust -= 0.15;
        }
      },
      {
        text: "Follow safety protocols.",
        effect: (s) => {
          s.population -= 0.02; // Delay costs lives
          s.trust += 0.02;
        }
      }
    ]
  },
  15: {
    text: "DAY 15: OVERFLOW\nMorgues are full.",
    choices: [
      {
        text: "Mass Burials (Parks).",
        effect: (s) => {
          s.trust -= 0.05;
          s.infection += 0.02;
        }
      },
      {
        text: "Incineration (Pollution).",
        effect: (s) => {
          s.trust -= 0.10;
          s.infection -= 0.02;
        }
      }
    ]
  },
  16: {
    text: "DAY 16: ECONOMIC CRASH\nHyperinflation has started.",
    choices: [
      {
        text: "Freeze prices.",
        effect: (s) => {
          s.economy += 0.05;
          s.trust -= 0.05; // Black markets form
        }
      },
      {
        text: "Switch to digital rationing.",
        effect: (s) => {
          s.economy -= 0.02;
          s.trust -= 0.02;
        }
      }
    ]
  },
  17: {
    text: "DAY 17: REGIONAL SACRIFICE\nThe North is 80% infected.",
    choices: [
      {
        text: "Seal the North (Extreme Choice).",
        effect: (s) => {
          s.population -= 0.15; // Drastic Hit
          s.infection -= 0.30; // Drastic Reward
          s.trust -= 0.20;
          s.flags.lockdown = true;
        }
      },
      {
        text: "Send aid.",
        effect: (s) => {
          s.infection += 0.05;
          s.healthcare_load += 0.10;
        }
      }
    ]
  },
  18: {
    text: "DAY 18: FOREIGN INTERVENTION\nA superpower offers aid for sovereignty.",
    choices: [
      {
        text: "Accept Aid.",
        effect: (s) => {
          s.healthcare_load -= 0.20;
          s.trust -= 0.10;
        }
      },
      {
        text: "Reject.",
        effect: (s) => {
          s.population -= 0.02;
        }
      }
    ]
  },
  19: {
    text: "DAY 19: THE CURE?\nWe need more test subjects.",
    choices: [
      {
        text: "Mandatory Testing.",
        effect: (s) => {
          s.flags.cure_progress += 30;
          s.trust -= 0.10;
        }
      },
      {
        text: "Volunteer only.",
        effect: (s) => {
          s.flags.cure_progress += 10;
        }
      }
    ]
  },
  20: {
    text: "DAY 20: BLACKOUT\nThe grid is failing.",
    choices: [
      {
        text: "Power to Hospitals only.",
        effect: (s) => {
          s.healthcare_load -= 0.05;
          s.economy -= 0.10;
        }
      },
      {
        text: "Rolling Blackouts.",
        effect: (s) => {
          s.healthcare_load += 0.05;
          s.economy -= 0.02;
        }
      }
    ]
  },
  21: {
    text: "DAY 21: THE ARK\nA bunker for the leadership.",
    choices: [
      {
        text: "Secure the bunker.",
        effect: (s) => {
          s.trust -= 0.15;
          s.economy += 0.02;
        }
      },
      {
        text: "Turn bunker into hospital.",
        effect: (s) => {
          s.trust += 0.10;
          s.healthcare_load -= 0.05;
        }
      }
    ]
  },
  22: {
    text: "DAY 22: DATA LOSS\nWe are flying blind.",
    choices: [
      {
        text: "Estimate data.",
        effect: (s) => {
          s.trust -= 0.02;
        }
      },
      {
        text: "Lift restrictions.",
        effect: (s) => {
          s.infection += 0.15;
          s.economy += 0.05;
        }
      }
    ]
  },
  23: {
    text: "DAY 23: STERILIZATION\nA gas can kill the virus but causes sterility.",
    choices: [
      {
        text: "Release the gas (Extreme).",
        effect: (s) => {
          s.infection = 0.05; // Cured
          s.flags.sterility = true;
          s.trust -= 0.30;
        }
      },
      {
        text: "Refuse.",
        effect: (s) => {
          s.population -= 0.05;
        }
      }
    ]
  },
  24: {
    text: "DAY 24: COLLAPSE\nGovernment is dissolving.",
    choices: [
      {
        text: "Martial Law.",
        effect: (s) => {
          s.trust = 0.15;
          s.economy += 0.05;
        }
      },
      {
        text: "Form Community Councils.",
        effect: (s) => {
          s.trust += 0.10;
          s.economy -= 0.10;
        }
      }
    ]
  },
  25: {
    text: "DAY 25: ZERO HOUR\nIt is over.",
    choices: [
      {
        text: "Assess the damage.",
        effect: (s) => {
          normalizeState();
        }
      }
    ]
  }
};

// ==========================================
// 6. ENDING CONDITIONS
// ==========================================

function checkEnding() {
  if (state.day < 16) return null;

  // 1. EXTINCTION (Population < 15%)
  if (state.population < 0.15) {
    return "ENDING: HUMAN EXTINCTION.\nThe virus has won. Silence falls over the cities.";
  }

  // 2. SOCIETAL COLLAPSE (Economy < 20%)
  if (state.economy < 0.20) {
    return "ENDING: COUNTRY COLLAPSE.\nThe nation has dissolved. Starvation claims those the virus missed.";
  }

  // 3. GENERATIONAL TRAUMA (Trust < 20%)
  if (state.trust < 0.20) {
    return "ENDING: REVOLUTION.\nThe government has fallen. The survivors will never trust authority again.";
  }

  // 4. BIOLOGICAL CASCADE (Healthcare 100% & Infection > 50%)
  if (state.healthcare_load >= 1.0 && state.infection > 0.50) {
    return "ENDING: TOTAL FAILURE.\nHospitals became death traps. The system has broken.";
  }

  // 5. CONTROLLED ERADICATION (Win State)
  if (
    state.population > 0.40 &&
    state.economy > 0.30 &&
    state.trust > 0.50 &&
    state.infection < 0.10
  ) {
    return "ENDING: CONTROLLED ERADICATION.\nWe have survived. The cost was high, but humanity endures.";
  }

  // 6. HARD STOP (Day 26)
  if (state.day > 25) {
    return "ENDING: UNCERTAIN FUTURE.\nThe worst is over, but the world is forever changed.";
  }

  return null;
}

// ==========================================
// 7. MAIN GAME LOOP API
// ==========================================

function getStatusReport() {
  // Ensure values are safe before printing
  normalizeState(); 
  
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

  // --- INPUT VALIDATION ---
  if (choiceIndex !== null) {
    // Check interruption vs normal
    let currentChoices = state.activeInterruption ? state.activeInterruption.choices : (scenarios[state.day] ? scenarios[state.day].choices : []);
    
    if (!currentChoices[choiceIndex]) {
      // Re-display current text context
      let text = state.activeInterruption ? state.activeInterruption.text : scenarios[state.day].text;
      
      return {
        text: ">> SYSTEM ALERT: This is not the time to fool around, agent. You hold a lot more power than you see. Focus.\n\n" + text + "\n\n" + currentChoices.map((c, i) => `[${i+1}] ${c.text}`).join('\n'),
        choices: currentChoices.length,
        ended: false,
        critical: state.flags.criticalMode
      };
    }
  }

  // --- APPLY CHOICE ---
  if (choiceIndex !== null) {
    if (state.activeInterruption) {
      output.push(`>> ACTION: ${state.activeInterruption.choices[choiceIndex].text}`);
      state.activeInterruption.choices[choiceIndex].effect(state);
      state.activeInterruption = null;
      normalizeState(); // Fix values immediately
    } else {
      const scenario = scenarios[state.day];
      output.push(`>> ACTION: ${scenario.choices[choiceIndex].text}`);
      scenario.choices[choiceIndex].effect(state);
      normalizeState(); // Fix values immediately
      
      runDailySimulation();
      state.day++;
    }
  }

  // --- RED TEXT LOGIC (70% / 75%) ---
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

  // --- CHECK FOR INTERRUPTION ---
  if (!state.activeInterruption) {
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
  }

  // --- NORMAL DAY ---
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
    return {
      text: "Signal lost...",
      choices: 0,
      ended: true,
      critical: state.flags.criticalMode
    };
  }
}
