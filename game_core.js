/**
 * PANDEMIC DIRECTIVE
 */

// game state

const state = {
  day: 1,

  // PRIMARY STATS (0.0 to 1.0)
  population: 1.0,      // 100% = Full population. < 15% = Extinction.
  economy: 0.75,        // 100% = Boom. < 20% = Collapse.
  trust: 0.60,          // 100% = Worship. < 20% = Government Fall.
  
  // THREAT STATS (0.0 to 1.0)
  infection: 0.04,      // 0% = Clean. > 50% + High Healthcare = Extinction.
  healthcare_load: 0.15,// 0% = Empty. 100% = Collapsed/Full.

  // SYSTEM FLAGS & HISTORY
  flags: {
    criticalMode: false, // Triggers Red Text
    lockdown: false,
    militarized: false,
    cure_progress: 0
  }
};

// utility functions

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function noise(scale = 0.02) {
  return (Math.random() - 0.5) * scale;
}

// system

function runDailySimulation() {
  // --- INFECTION DYNAMICS ---
  // Infection increases naturally.
  // Increases faster if Trust is low (people ignore rules).
  // Decreases if Population is extremely low (fewer hosts).
  let viralGrowth = 1.05; 
  if (state.trust < 0.3) viralGrowth += 0.04;
  if (state.flags.lockdown) viralGrowth -= 0.06;
  if (state.healthcare_load > 0.9) viralGrowth += 0.03; // Hospitals becoming spread centers

  state.infection = state.infection * viralGrowth;
  state.infection += noise(0.01);

  // --- HEALTHCARE DYNAMICS ---
  // Capacity usage increases based on Infection spread.
  // Natural "increase" (bad) due to worker fatigue/supply usage over time.
  state.healthcare_load += (state.infection * 0.35); 
  state.healthcare_load += 0.01; 

  // --- ECONOMY DYNAMICS ---
  // Constantly decreases.
  // Decreases RAPIDLY if Infection is high (sick workforce).
  // Decreases if Unrest is high (Low Trust).
  let ecoDecay = 0.01; // Base decay
  if (state.infection > 0.3) ecoDecay += 0.02;
  if (state.trust < 0.3) ecoDecay += 0.02;
  if (state.day > 20) ecoDecay += 0.02; // Late game exhaustion
  
  state.economy -= ecoDecay;

  // --- POPULATION DYNAMICS ---
  // Decreases based on Infection.
  // If Healthcare is overwhelmed (>90%), death rate spikes.
  let deathRate = state.infection * 0.015; 
  if (state.healthcare_load > 0.9) {
    deathRate *= 3.0; // Lack of care kills
  }
  state.population -= deathRate;

  // --- TRUST DYNAMICS ---
  // Constantly decreases slowly.
  // Drops if Economy crashes.
  // Drops massively if Population dies suddenly.
  state.trust -= 0.01;
  if (state.economy < 0.3) state.trust -= 0.02;
  if (state.healthcare_load > 0.95) state.trust -= 0.03;

  // --- CLAMP VALUES ---
  state.infection = clamp(state.infection);
  state.population = clamp(state.population);
  state.economy = clamp(state.economy);
  state.healthcare_load = clamp(state.healthcare_load);
  state.trust = clamp(state.trust);
}

// scenario

const scenarios = {
  1: {
    text: "DAY 1: PATIENT ZERO\nReports from the capital's general hospital indicate a cluster of respiratory failures. The mortality rate is abnormally high (8%). Intelligence suggests a novel pathogen.",
    choices: [
      {
        text: "Keep it quiet. Avoid panic.",
        effect: (s) => {
          s.economy += 0.02; 
          s.infection += 0.05; 
          s.trust -= 0.05; // Leaks happen
        }
      },
      {
        text: "Declare a public health emergency.",
        effect: (s) => {
          s.economy -= 0.05; 
          s.trust += 0.05; 
          s.healthcare_load -= 0.05; // Prep starts
        }
      }
    ]
  },
  2: {
    text: "DAY 2: BORDER CONTROL\nNeighboring nations are watching. Closing borders will sever trade routes essential for food and tech, but might slow the viral entry.",
    choices: [
      {
        text: "Close all borders immediately.",
        effect: (s) => {
          s.economy -= 0.10; 
          s.infection -= 0.03; 
          s.trust += 0.03;
        }
      },
      {
        text: "Keep trade open with screening.",
        effect: (s) => {
          s.economy += 0.03;
          s.infection += 0.04; 
        }
      }
    ]
  },
  3: {
    text: "DAY 3: THE STOCK MARKET\nThe index is plummeting. Investors are demanding reassurance.",
    choices: [
      {
        text: "Inject state funds to stabilize markets.",
        effect: (s) => {
          s.economy += 0.10;
          s.healthcare_load += 0.05; // Budget diverted from health
        }
      },
      {
        text: "Let the market crash. Save funds for hospitals.",
        effect: (s) => {
          s.economy -= 0.15;
          s.healthcare_load -= 0.10; 
        }
      }
    ]
  },
  4: {
    text: "DAY 4: THE WHISTLEBLOWER\nA doctor posted photos of overflowing morgues. It's viral. We can arrest her for 'inciting panic' or validate her claims.",
    choices: [
      {
        text: "Arrest the doctor. Delete the photos.",
        effect: (s) => {
          s.trust -= 0.15; 
          s.economy += 0.02; // Short term calm
        }
      },
      {
        text: "Validate the report. Warn the public.",
        effect: (s) => {
          s.trust += 0.10;
          s.economy -= 0.05;
        }
      }
    ]
  },
  5: {
    text: "DAY 5: LOCKDOWN PROTOCOL\nInfection is spiking. Advisors suggest a total home confinement order.",
    choices: [
      {
        text: "Enforce Total Lockdown.",
        effect: (s) => {
          s.economy -= 0.15;
          s.infection -= 0.10; 
          s.trust -= 0.05; 
          s.flags.lockdown = true;
        }
      },
      {
        text: "Recommend 'Social Distancing' only.",
        effect: (s) => {
          s.economy -= 0.02;
          s.infection += 0.08;
          s.trust += 0.05; 
        }
      }
    ]
  },
  6: {
    text: "DAY 6: SUPPLY CHAINS\nPanic buying has emptied supermarkets. Food riots are starting.",
    choices: [
      {
        text: "Ration food via military distribution.",
        effect: (s) => {
          s.trust -= 0.08;
          s.population += 0.01; 
          s.economy -= 0.05;
          s.flags.militarized = true;
        }
      },
      {
        text: "Let the market regulate itself.",
        effect: (s) => {
          s.economy += 0.05; 
          s.population -= 0.02; // Starvation/violence
          s.trust -= 0.05;
        }
      }
    ]
  },
  7: {
    text: "DAY 7: RELIGIOUS GATHERING\nA major religious festival is tomorrow. Clergy demands the right to gather.",
    choices: [
      {
        text: "Ban the gathering.",
        effect: (s) => {
          s.trust -= 0.15; 
          s.infection -= 0.05;
        }
      },
      {
        text: "Allow it with 'guidelines'.",
        effect: (s) => {
          s.trust += 0.10;
          s.infection += 0.15; // Spreader event
          s.healthcare_load += 0.10;
        }
      }
    ]
  },
  8: {
    text: "DAY 8: TRIAGE ETHICS\nHospitals are at capacity. Doctors ask for permission to stop treating the elderly to save the young.",
    choices: [
      {
        text: "Authorize Aggressive Triage (Save the young).",
        effect: (s) => {
          s.healthcare_load -= 0.20; 
          s.population -= 0.05; 
          s.trust -= 0.20; 
        }
      },
      {
        text: "First come, first served.",
        effect: (s) => {
          s.healthcare_load += 0.20; 
          s.population -= 0.03;
          s.trust += 0.05; 
        }
      }
    ]
  },
  9: {
    text: "DAY 9: CORPORATE BAILOUT\nTech giants and Airlines are bankrupt. They demand a bailout or they fire 50% of the workforce.",
    choices: [
      {
        text: "Print money to bail them out.",
        effect: (s) => {
          s.economy += 0.20;
          s.trust -= 0.10; // Inflation fears
        }
      },
      {
        text: "Let them fail.",
        effect: (s) => {
          s.economy -= 0.25; 
          s.trust += 0.05; 
        }
      }
    ]
  },
  10: {
    text: "DAY 10: DISINFORMATION\nAn internet celebrity is selling a toxic 'miracle cure'. Thousands are poisoning themselves.",
    choices: [
      {
        text: "Shut down internet in affected regions.",
        effect: (s) => {
          s.trust -= 0.15;
          s.infection -= 0.02; 
        }
      },
      {
        text: "Launch an education campaign.",
        effect: (s) => {
          s.trust += 0.05;
          s.population -= 0.03; // Too slow
        }
      }
    ]
  },
  11: {
    text: "DAY 11: THE MUTATION\nThe virus has mutated. It's now airborne and more lethal.",
    choices: [
      {
        text: "Suppress this information.",
        effect: (s) => {
          s.trust += 0.05; 
          s.infection += 0.12; 
        }
      },
      {
        text: "Announce the mutation.",
        effect: (s) => {
          s.trust -= 0.12; 
          s.infection -= 0.04; 
        }
      }
    ]
  },
  12: {
    text: "DAY 12: MARTIAL LAW\nLooting is widespread. Local police have deserted.",
    choices: [
      {
        text: "Deploy the Army. Shoot looters.",
        effect: (s) => {
          s.trust -= 0.20;
          s.population -= 0.02;
          s.economy += 0.05; 
          s.flags.militarized = true;
        }
      },
      {
        text: "Attempt community policing.",
        effect: (s) => {
          s.trust += 0.10;
          s.economy -= 0.10; 
        }
      }
    ]
  },
  13: {
    text: "DAY 13: THE PROPAGANDA\nWe can manipulate death statistics to calm the public and boost the stock market.",
    choices: [
      {
        text: "Falsify the data.",
        effect: (s) => {
          s.economy += 0.10;
          s.trust += 0.05;
          s.infection += 0.10; // False sense of security
        }
      },
      {
        text: "Release raw data.",
        effect: (s) => {
          s.economy -= 0.10;
          s.trust -= 0.10;
        }
      }
    ]
  },
  14: {
    text: "DAY 14: MASS DISPOSAL\nMorgues are full. Bodies are piling in streets, spreading disease.",
    choices: [
      {
        text: "Mass incineration (Burn pits).",
        effect: (s) => {
          s.healthcare_load -= 0.10;
          s.trust -= 0.15; 
          s.infection -= 0.05;
        }
      },
      {
        text: "Designate mass grave parks.",
        effect: (s) => {
          s.trust -= 0.05;
          s.infection += 0.03; 
        }
      }
    ]
  },
  15: {
    text: "DAY 15: VACCINE TRIALS\nWe have a prototype. It's unsafe. We can test it on prisoners.",
    choices: [
      {
        text: "Authorize human experimentation.",
        effect: (s) => {
          s.trust -= 0.20; 
          s.flags.cure_progress += 50;
          s.healthcare_load -= 0.05; // Hope
        }
      },
      {
        text: "Follow standard safety protocols.",
        effect: (s) => {
          s.trust += 0.05;
          s.population -= 0.05; // Delay costs lives
        }
      }
    ]
  },
  16: {
    text: "DAY 16: ECONOMIC CRASH\nThe currency is collapsing. Hyperinflation sets in.",
    choices: [
      {
        text: "Freeze all bank assets.",
        effect: (s) => {
          s.economy += 0.15; 
          s.trust -= 0.25; 
        }
      },
      {
        text: "Switch to digital rationing credits.",
        effect: (s) => {
          s.economy -= 0.05;
          s.trust -= 0.10;
        }
      }
    ]
  },
  17: {
    text: "DAY 17: REGIONAL SACRIFICE\nThe infection is concentrated in the South (30% of pop). We can destroy bridges and cut power/water to seal them in.",
    choices: [
      {
        text: "Sacrifice the South.",
        effect: (s) => {
          s.population -= 0.30;
          s.infection -= 0.40; // Massive drop
          s.trust -= 0.40; 
          s.economy -= 0.20;
        }
      },
      {
        text: "Try to save them.",
        effect: (s) => {
          s.infection += 0.10;
          s.healthcare_load += 0.20;
        }
      }
    ]
  },
  18: {
    text: "DAY 18: FOREIGN AID\nA rival superpower offers aid, but demands military bases on our soil.",
    choices: [
      {
        text: "Accept aid (Surrender sovereignty).",
        effect: (s) => {
          s.healthcare_load -= 0.30;
          s.economy += 0.15;
          s.trust -= 0.20; 
        }
      },
      {
        text: "Reject aid.",
        effect: (s) => {
          s.economy -= 0.05;
          s.population -= 0.05;
        }
      }
    ]
  },
  19: {
    text: "DAY 19: THE IMMUNE\nA small group of children appear naturally immune. Dissecting them could yield a cure immediately.",
    choices: [
      {
        text: "Sacrifice the children for the cure.",
        effect: (s) => {
          s.population += 0.05; 
          s.trust -= 0.30; 
          s.flags.cure_progress += 100;
          s.infection -= 0.20;
        }
      },
      {
        text: "Take samples non-invasively (Slow).",
        effect: (s) => {
          s.trust += 0.10;
          s.infection += 0.05;
        }
      }
    ]
  },
  20: {
    text: "DAY 20: BLACKOUT\nThe power grid is failing due to lack of staff.",
    choices: [
      {
        text: "Divert power to hospitals only.",
        effect: (s) => {
          s.healthcare_load -= 0.10;
          s.economy -= 0.20; 
          s.trust -= 0.10; 
        }
      },
      {
        text: "Rolling blackouts for everyone.",
        effect: (s) => {
          s.healthcare_load += 0.15; 
          s.economy -= 0.10;
        }
      }
    ]
  },
  21: {
    text: "DAY 21: THE ELITE'S ARK\nRich citizens are building a secure bunker city, draining resources. The poor are gathering to storm it.",
    choices: [
      {
        text: "Protect the rich (Preserve capital).",
        effect: (s) => {
          s.economy += 0.15;
          s.trust -= 0.25;
          s.population -= 0.05; 
        }
      },
      {
        text: "Seize the bunker for the sick.",
        effect: (s) => {
          s.healthcare_load -= 0.15;
          s.economy -= 0.20; 
          s.trust += 0.20;
        }
      }
    ]
  },
  22: {
    text: "DAY 22: DATA CORRUPTION\nWe've lost track of infection numbers. The data system has collapsed.",
    choices: [
      {
        text: "Guess (Fabricate optimistic data).",
        effect: (s) => {
          s.trust += 0.05;
          s.infection += 0.10; 
        }
      },
      {
        text: "Admit we are blind.",
        effect: (s) => {
          s.trust -= 0.15;
          s.economy -= 0.05;
        }
      }
    ]
  },
  23: {
    text: "DAY 23: LAST RESORT\nScientists propose releasing a chemical agent that kills the virus but causes sterility in 50% of humans.",
    choices: [
      {
        text: "Release the agent.",
        effect: (s) => {
          s.infection = 0.05; 
          s.trust -= 0.30;
          s.flags.sterility = true;
        }
      },
      {
        text: "Wait for a better way.",
        effect: (s) => {
          s.population -= 0.10;
        }
      }
    ]
  },
  24: {
    text: "DAY 24: TOTAL ANARCHY\nThe government has effectively fallen. Local warlords are rising.",
    choices: [
      {
        text: "Recognize warlords as regional governors.",
        effect: (s) => {
          s.economy += 0.10; 
          s.trust -= 0.20;
        }
      },
      {
        text: "Fight them to the last man.",
        effect: (s) => {
          s.population -= 0.15; 
          s.trust += 0.10; 
        }
      }
    ]
  },
  25: {
    text: "DAY 25: THE SILENCE\nPopulation density is so low the virus is naturally dying out. Survivors are emerging.",
    choices: [
      {
        text: "Rebuild Economy (Force labor).",
        effect: (s) => {
          s.economy += 0.20;
          s.trust -= 0.20;
        }
      },
      {
        text: "Mourn the dead (Day of Silence).",
        effect: (s) => {
          s.trust += 0.20;
          s.economy -= 0.10;
        }
      }
    ]
  }
};

// ending conditions

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
  // "Country collapses but world is saved... surviving people suffer trauma"
  if (state.trust < 0.20) {
    return "ENDING: GENERATIONAL TRAUMA.\nThe government falls. The virus is contained, but the survivors will never trust authority again. History will judge you.";
  }

  // 4. BIOLOGICAL CASCADE (Healthcare 100% & Infection > 50%)
  if (state.healthcare_load >= 1.0 && state.infection > 0.50) {
    return "ENDING: EXTINCTION (CASCADING FAILURE).\nHospitals became incubation centers. The viral load is too high for species survival.";
  }

  // 5. CONTROLLED ERADICATION (Win State)
  // Pop > 30%, Eco > 30%, Trust > 55%, Infection < 10%
  if (
    state.population > 0.30 &&
    state.economy > 0.30 &&
    state.trust > 0.55 &&
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

// main game api

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

  // 1. Process User Choice (if valid)
  if (choiceIndex !== null) {
    const scenario = scenarios[state.day];
    if (scenario && scenario.choices[choiceIndex]) {
      output.push(`>> ACTION: ${scenario.choices[choiceIndex].text}`);
      scenario.choices[choiceIndex].effect(state);
    }
  }

  // 2. Run Simulation (Natural Decay/Growth)
  // We only run this if we aren't at the very start of Day 1 before input
  if (state.day > 0 && choiceIndex !== null) {
    runDailySimulation();
    state.day++; // Advance to next day
  }

  // 3. Check for "Red Text" Condition (Population < 50%)
  // Logic: Critical mode activates below 50%. Deactivates only at 55%.
  if (state.population < 0.50) {
    state.flags.criticalMode = true;
  } else if (state.population >= 0.55) {
    state.flags.criticalMode = false;
  }

  // 4. Check for End Game
  const ending = checkEnding();
  if (ending) {
    output.push(getStatusReport());
    output.push("");
    output.push("================================");
    output.push(ending);
    output.push("================================");
    return {
      text: output.join("\n"),
      choices: 0,
      ended: true,
      critical: state.flags.criticalMode
    };
  }

  // 5. Present Next Day
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
      text: "Error: No scenario data found.",
      choices: 0,
      ended: true,
      critical: state.flags.criticalMode
    };
  }
}
