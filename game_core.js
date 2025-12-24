/**
 * PANDEMIC DIRECTIVE: ZERO HOUR
 * CORE LOGIC - COMPLETE OVERHAUL (3+ Choices, Mutation Arc, Balancing)
 */

// ==========================================
// 1. GAME STATE
// ==========================================

let state = {
  day: 1,
  // Stats (Normalized 0.0 to 1.0)
  population: 1.0, 
  economy: 0.80, 
  trust: 0.70,
  infection: 0.05, 
  healthcare_load: 0.10,

  // Advisors
  advisors: { kael: 50, aris: 50 },

  // Tracking
  arc: 'main', 
  arcProgress: 0,
  usedEvents: [], 
  usedNews: [],   
  
  // NEW: Biological Mutation Tracking
  virus: {
    name: "Alpha Strain",
    lethality: 1.0,   // Multiplier for death rate
    infectivity: 1.0, // Multiplier for spread rate
    mutation_level: 0
  },

  // Flags
  flags: {
    criticalMode: false, lockdown: false, militarized: false,
    cure_progress: 0, sterility: false, border_closed: false,
    media_censored: false, kael_rebelled: false, aris_resigned: false,
    mutation_studied: false
  },

  // Temp Holders
  activeInterruption: null, currentScenario: null
};

// ==========================================
// 2. MATH & HELPERS
// ==========================================

function clamp(v) { return Math.max(0, Math.min(1, v)); }

function normalizeState() {
  state.population = clamp(state.population);
  state.economy = clamp(state.economy);
  state.trust = clamp(state.trust);
  state.infection = clamp(state.infection);
  state.healthcare_load = clamp(state.healthcare_load);
}

function modifyLoyalty(advisor, amount) {
  if (advisor === 'kael') {
    state.advisors.kael += amount;
    state.advisors.aris -= (amount / 3);
  } else {
    state.advisors.aris += amount;
    state.advisors.kael -= (amount / 3);
  }
}

function noise(scale=0.02) { return (Math.random() - 0.5) * scale; }

// ==========================================
// 3. ROBUST SIMULATION ENGINE
// ==========================================

function runDailySimulation() {
  // Base Spread calculated with Virus Infectivity
  let spreadRate = 0.15 * state.virus.infectivity; 
  
  // Modifiers
  if (state.flags.lockdown) spreadRate -= 0.12;
  if (state.trust < 0.4) spreadRate += 0.06; // Panic spreads virus
  if (state.healthcare_load > 0.9) spreadRate += 0.05; 
  
  // Cure progress actively fights spread
  if (state.flags.cure_progress > 0) {
    spreadRate -= (state.flags.cure_progress / 100) * 0.6; 
  }

  // Logistic Growth
  let growth = spreadRate * state.infection * (1 - state.infection);
  state.infection += growth + noise(0.01);

  // Victory Snap-to-Zero (If cure is high and infection is low)
  if (state.infection < 0.01 && state.flags.cure_progress > 50) state.infection = 0;

  // Healthcare Rubber-banding
  let targetLoad = state.infection * 1.3;
  state.healthcare_load += (targetLoad - state.healthcare_load) * 0.25;
  state.healthcare_load += 0.01;

  // Economy Decay
  let ecoDecay = 0.005;
  if (state.flags.lockdown) ecoDecay += 0.03;
  if (state.infection > 0.3) ecoDecay += 0.02;
  state.economy -= ecoDecay;

  // Mortality (Scaled by Virus Lethality)
  let baseDeath = 0.001;
  let infectionDeath = (state.infection * 0.015) * state.virus.lethality;
  
  if (state.healthcare_load > 0.95) infectionDeath *= 1.5; // Collapse penalty
  state.population -= (baseDeath + infectionDeath);

  // Trust Dynamics
  if (state.economy < 0.3) state.trust -= 0.02;
  if (state.population < 0.85) state.trust -= 0.03;

  // Advisor Checks
  checkAdvisorStatus();
  normalizeState();
}

function checkAdvisorStatus() {
  if (state.advisors.kael <= 10 && !state.flags.kael_rebelled) {
    state.flags.kael_rebelled = true;
    state.trust -= 0.15;
    triggerInterruption("MILITARY COUP", "General Kael has turned the joint chiefs against you.", [
      { text: "Purge the military command.", effect: (s) => { s.population -= 0.05; s.trust -= 0.10; } }
    ]);
  }
  if (state.advisors.aris <= 10 && !state.flags.aris_resigned) {
    state.flags.aris_resigned = true;
    state.trust -= 0.10;
    triggerInterruption("MEDICAL WALKOUT", "Dr. Aris resigned. Doctors are striking.", [
      { text: "Force them back to work.", effect: (s) => { s.trust -= 0.15; s.healthcare_load -= 0.05; } }
    ]);
  }
}

// ==========================================
// 4. NEWS HEADLINE SYSTEM
// ==========================================

const newsPool = [
  { id: 'n1', text: "BREAKING: WHO Declares Global Pandemic Level 6", condition: s => s.day === 2 },
  { id: 'n2', text: "ALERT: Neighboring Countries Close Borders", condition: s => s.infection > 0.1 },
  { id: 'n3', text: "ECONOMY: Stock Market Suspended Indefinitely", condition: s => s.economy < 0.5 },
  { id: 'n4', text: "CRISIS: Morgues At Capacity, Ice Rinks Requisitioned", condition: s => s.population < 0.95 },
  { id: 'n5', text: "RIOT: Police Station Burned Down in Capital", condition: s => s.trust < 0.4 },
  { id: 'n6', text: "SCIENCE: Vaccine Prototype Shows Promise in Lab", condition: s => s.flags.cure_progress > 20 },
  { id: 'n7', text: "PANIC: Supermarket Shelves Empty Nationwide", condition: s => s.economy < 0.7 },
  { id: 'n8', text: "LEAK: Senator Caught Fleeing to Private Bunker", condition: s => s.trust < 0.6 },
  { id: 'n9', text: "REPORT: Virus Mutation Detected in Water Supply", condition: s => s.infection > 0.3 },
  { id: 'n10', text: "OPINION: 'Is the Government Lying?' Trends #1", condition: s => s.flags.media_censored },
  { id: 'n11', text: "HOPE: Recovery Rates Improving Slightly", condition: s => s.healthcare_load < 0.5 && s.day > 10 },
  { id: 'n12', text: "BLACKOUT: Power Grid Failure in Sector 7", condition: s => s.economy < 0.4 },
  { id: 'n13', text: "TRAGEDY: Famous Actor Dies of Infection", condition: s => s.day > 5 },
  { id: 'n14', text: "INTERNATIONAL: China Offers Aid Package", condition: s => s.economy < 0.3 },
  { id: 'n15', text: "WARNING: Looters Targeting Pharmacies", condition: s => s.trust < 0.5 },
  { id: 'n16', text: "UPDATE: Military Vehicles on Main Streets", condition: s => s.flags.militarized },
  { id: 'n17', text: "HEALTH: Doctors Reporting Extreme Fatigue", condition: s => s.healthcare_load > 0.8 },
  { id: 'n18', text: "DATA: Infection Curve is Vertical", condition: s => s.infection > 0.5 },
  { id: 'n19', text: "SCANDAL: Fake Vaccines Sold on Black Market", condition: s => s.trust < 0.5 },
  { id: 'n20', text: "RESISTANCE: 'Freedom Convoy' Blockades Highways", condition: s => s.flags.lockdown },
  { id: 'n21', text: "RELIGION: Cult Suicides Reported in Rural Areas", condition: s => s.trust < 0.3 },
  { id: 'n22', text: "NATURE: Wildlife Entering Abandoned City Centers", condition: s => s.population < 0.8 },
  { id: 'n23', text: "TECH: AI Predicts 90% Probability of Collapse", condition: s => s.economy < 0.2 },
  { id: 'n24', text: "VICTORY: Zero New Cases Reported Today", condition: s => s.infection <= 0 }
];

function checkNews() {
  if (Math.random() < 0.75) return null;
  const candidates = newsPool.filter(n => !state.usedNews.includes(n.id) && n.condition(state));
  if (candidates.length > 0) {
    const news = candidates[Math.floor(Math.random() * candidates.length)];
    state.usedNews.push(news.id);
    return news.text;
  }
  return null;
}

// ==========================================
// 5. ENHANCED CONTENT POOLS
// ==========================================

// --- A. BALANCING EVENTS (Triggered when failing) ---
const balancingEvents = [
  {
    id: 'bal_eco',
    condition: s => s.economy < 0.25,
    text: "CRITICAL ALERT: ECONOMIC COLLAPSE IMMINENT\nThe World Bank offers an emergency lifeline, but it comes with strings attached.",
    choices: [
      { text: "Accept Bailout (Restore Economy, lose Trust).", effect: s => { s.economy += 0.30; s.trust -= 0.15; } },
      { text: "Seize Private Assets (Restore Economy, Risk Riots).", effect: s => { s.economy += 0.25; s.trust -= 0.20; s.flags.militarized = true; } },
      { text: "Reject Aid (Maintain sovereignty, High Risk).", effect: s => { s.economy -= 0.05; s.trust += 0.05; } }
    ]
  },
  {
    id: 'bal_trust',
    condition: s => s.trust < 0.25,
    text: "CRITICAL ALERT: GOVERNMENT DISSOLUTION\nThe people are storming the gates. You need to speak to them.",
    choices: [
      { text: "Televised Apology (Restore Trust, lose Authority).", effect: s => { s.trust += 0.25; s.advisors.kael -= 20; } },
      { text: "Scapegoat Dr. Aris (Restore Trust, Aris Resigns).", effect: s => { s.trust += 0.20; s.advisors.aris = 0; } },
      { text: "Martial Law (Force Order, Lose Pop).", effect: s => { s.trust += 0.10; s.population -= 0.05; s.flags.militarized = true; } }
    ]
  }
];

// --- B. MUTATION ARC (Biologically Accurate) ---
const mutationEvents = [
  {
    id: 'mut_1',
    text: "BIO-LAB REPORT: ANOMALY DETECTED\nViral RNA sequencing shows drift in the spike protein. It could be nothing, or the start of a new strain.",
    choices: [
      { text: "Dedicate resources to study it.", effect: s => { s.economy -= 0.05; s.flags.mutation_studied = true; s.flags.cure_progress += 5; } },
      { text: "Ignore. Focus on current containment.", effect: s => { s.virus.infectivity += 0.1; } },
      { text: "Censor the data to prevent panic.", effect: s => { s.trust -= 0.05; s.flags.media_censored = true; } }
    ]
  },
  {
    id: 'mut_2',
    text: "VARIANT ALERT: 'EPSILON' STRAIN\nThe virus has evolved. It is more aggressive and resisting standard treatments.",
    choices: [
      { text: "Emergency Lockdown (Halt spread).", effect: s => { s.virus.infectivity += 0.2; s.virus.lethality += 0.1; s.flags.lockdown = true; s.economy -= 0.10; } },
      { text: "Accelerate mRNA trials (High Risk/High Reward).", effect: s => { s.virus.infectivity += 0.2; s.virus.lethality += 0.1; s.flags.cure_progress += 20; s.population -= 0.02; } },
      { text: "Let it burn through (Herd Immunity attempt).", effect: s => { s.virus.infectivity += 0.4; s.virus.lethality += 0.4; s.economy += 0.05; s.population -= 0.08; } }
    ]
  }
];

// --- C. STANDARD EVENT POOL (3 Choices Each) ---
const eventPool = [
  { 
    id: 'e1', 
    text: "SITUATION: OXYGEN LEAK\nA main oxygen tank at Central Hospital has ruptured.", 
    choices: [
      { text: "Divert industrial oxygen (Hurt Economy).", effect: s => { s.economy -= 0.05; s.healthcare_load -= 0.05; } }, 
      { text: "Ration oxygen (Deaths, save Money).", effect: s => { s.population -= 0.01; s.trust -= 0.05; } },
      { text: "Raid neighbor state for supplies (War Risk).", effect: s => { s.healthcare_load -= 0.10; s.trust += 0.05; s.flags.border_closed = true; } }
    ] 
  },
  { 
    id: 'e2', 
    text: "SITUATION: PRISON OUTBREAK\nInfection spreading in maximum security.", 
    choices: [
      { text: "Release non-violent offenders.", effect: s => { s.trust -= 0.10; s.infection += 0.02; } }, 
      { text: "Lock them in (Cruel).", effect: s => { s.trust -= 0.05; s.infection -= 0.01; } },
      { text: "Enlist them for hazardous waste duty.", effect: s => { s.economy += 0.02; s.population -= 0.01; } }
    ] 
  },
  { 
    id: 'e3', 
    text: "SITUATION: TRANSPORT STRIKE\nTruckers refuse to drive into infected zones.", 
    choices: [
      { text: "Triple hazard pay (High Cost).", effect: s => { s.economy -= 0.08; s.trust += 0.02; } }, 
      { text: "Military drivers (Force Order).", effect: s => { s.flags.militarized = true; s.trust -= 0.05; } },
      { text: "Invest in drone logistics (Tech Boost).", effect: s => { s.economy -= 0.10; s.trust += 0.05; } }
    ] 
  },
  { 
    id: 'e4', 
    text: "SITUATION: CELEBRITY INFLUENCER\nA pop star is telling fans the virus is a hoax.", 
    choices: [
      { text: "Publicly arrest them.", effect: s => { s.trust += 0.05; s.trust -= 0.10; } }, 
      { text: "Ignore it.", effect: s => { s.infection += 0.05; } },
      { text: "Invite them to a COVID ward (Reality check).", effect: s => { s.trust += 0.05; s.infection -= 0.01; } }
    ] 
  },
  { 
    id: 'e5', 
    text: "SITUATION: BLACK MARKET\nGangs are selling stolen medicine.", 
    choices: [
      { text: "Raids (Violent).", effect: s => { s.trust -= 0.05; s.economy += 0.02; } }, 
      { text: "Buy it back (Save lives).", effect: s => { s.economy -= 0.10; s.healthcare_load -= 0.05; } },
      { text: "Regulate and tax it (Pragmatic).", effect: s => { s.economy += 0.05; s.trust -= 0.10; } }
    ] 
  },
  { 
    id: 'e6', 
    text: "SITUATION: FOREIGN SPIES\nAgents caught trying to steal vaccine data.", 
    choices: [
      { text: "Execute them (Show Strength).", effect: s => { s.trust += 0.05; s.economy -= 0.05; } }, 
      { text: "Trade for supplies.", effect: s => { s.healthcare_load -= 0.10; s.trust -= 0.10; } },
      { text: "Feed them fake data (Sabotage).", effect: s => { s.trust += 0.02; s.flags.cure_progress += 2; } }
    ] 
  },
  { 
    id: 'e7', 
    text: "SITUATION: BANK RUN\nPeople draining ATMs.", 
    choices: [
      { text: "Freeze withdrawals.", effect: s => { s.trust -= 0.15; s.economy += 0.05; } }, 
      { text: "Print money (Inflation Risk).", effect: s => { s.economy -= 0.15; } },
      { text: "Switch to Digital Currency only.", effect: s => { s.economy += 0.05; s.trust -= 0.10; } }
    ] 
  },
  { 
    id: 'e8', 
    text: "SITUATION: TEACHERS UNION\nThey refuse to open schools.", 
    choices: [
      { text: "Close schools.", effect: s => { s.economy -= 0.05; s.infection -= 0.03; } }, 
      { text: "Fire them.", effect: s => { s.trust -= 0.10; s.infection += 0.05; } },
      { text: "Invest in remote learning.", effect: s => { s.economy -= 0.10; s.trust += 0.05; } }
    ] 
  },
  { 
    id: 'e9', 
    text: "SITUATION: BORDER REFUGEES\nThousands fleeing neighbor state.", 
    choices: [
      { text: "Let them in.", effect: s => { s.infection += 0.10; s.trust += 0.05; } }, 
      { text: "Turn them back.", effect: s => { s.trust -= 0.05; } },
      { text: "Build quarantine camps.", effect: s => { s.economy -= 0.05; s.trust -= 0.02; } }
    ] 
  },
  { 
    id: 'e10', 
    text: "SITUATION: DATA CENTER FIRE\nWe lost tracking data.", 
    choices: [
      { text: "Estimate (Guess).", effect: s => { s.trust -= 0.05; } }, 
      { text: "Divert funds to rebuild.", effect: s => { s.economy -= 0.05; } },
      { text: "Use AI reconstruction.", effect: s => { s.economy -= 0.02; s.trust += 0.02; } }
    ] 
  },
  { 
    id: 'e11', 
    text: "SITUATION: MASK PRICE GOUGING\nPharmacy chains increasing prices 500%.", 
    choices: [
      { text: "Seize the stock.", effect: s => { s.trust += 0.05; s.economy -= 0.02; } }, 
      { text: "Free market (Do nothing).", effect: s => { s.trust -= 0.10; s.economy += 0.01; } },
      { text: "Issue Ration Cards.", effect: s => { s.economy -= 0.01; s.trust += 0.02; } }
    ] 
  },
  { 
    id: 'e12', 
    text: "SITUATION: ABANDONED PETS\nStray dogs forming packs in cities.", 
    choices: [
      { text: "Cull them.", effect: s => { s.trust -= 0.05; } }, 
      { text: "Ignore.", effect: s => { s.infection += 0.01; } },
      { text: "Convert stadiums to shelters.", effect: s => { s.economy -= 0.02; s.trust += 0.05; } }
    ] 
  },
  { 
    id: 'e13', 
    text: "SITUATION: WATER SHORTAGE\nTreatment plant failure.", 
    choices: [
      { text: "Fix immediately (Expensive).", effect: s => { s.economy -= 0.08; } }, 
      { text: "Ration water.", effect: s => { s.trust -= 0.10; } },
      { text: "Import water from neighbor.", effect: s => { s.economy -= 0.05; s.trust += 0.02; } }
    ] 
  },
  { 
    id: 'e14', 
    text: "SITUATION: INTERNET OUTAGE\nRumors of a cyber attack.", 
    choices: [
      { text: "Blame terrorists (Rally flag).", effect: s => { s.trust += 0.02; s.flags.militarized = true; } }, 
      { text: "Admit infrastructure failure.", effect: s => { s.trust -= 0.05; } },
      { text: "Use satellite backup (Costly).", effect: s => { s.economy -= 0.10; s.trust += 0.05; } }
    ] 
  },
  { 
    id: 'e15', 
    text: "SITUATION: MILITIA RISING\nArmed citizens patrolling streets.", 
    choices: [
      { text: "Deputize them.", effect: s => { s.trust -= 0.10; s.flags.militarized = true; } }, 
      { text: "Disarm them (Risk conflict).", effect: s => { s.population -= 0.01; s.trust -= 0.05; } },
      { text: "Integrate into National Guard.", effect: s => { s.economy -= 0.02; s.flags.militarized = true; } }
    ] 
  },
  { 
    id: 'e16', 
    text: "SITUATION: FARMER PROTEST\nFood production halting.", 
    choices: [
      { text: "Subsidies.", effect: s => { s.economy -= 0.05; s.trust += 0.02; } }, 
      { text: "Import food.", effect: s => { s.economy -= 0.10; } },
      { text: "Invest in Synthetic Food.", effect: s => { s.economy -= 0.15; s.population += 0.05; } }
    ] 
  },
  { 
    id: 'e17', 
    text: "SITUATION: CRUISE SHIP\nInfected ship wants to dock.", 
    choices: [
      { text: "Allow docking.", effect: s => { s.infection += 0.05; s.trust += 0.05; } }, 
      { text: "Refuse.", effect: s => { s.trust -= 0.05; } },
      { text: "Sink it (Covert Ops).", effect: s => { s.trust -= 0.20; s.infection -= 0.01; } }
    ] 
  },
  { 
    id: 'e18', 
    text: "SITUATION: WASTE BUILDUP\nGarbage piling up.", 
    choices: [
      { text: "Burn it (Health risk).", effect: s => { s.trust -= 0.05; s.population -= 0.01; } }, 
      { text: "Army clean up.", effect: s => { s.flags.militarized = true; } },
      { text: "Pay private contractors.", effect: s => { s.economy -= 0.03; s.trust += 0.02; } }
    ] 
  },
  { 
    id: 'e19', 
    text: "SITUATION: SENATOR SCANDAL\nSenator caught at a party.", 
    choices: [
      { text: "Resignation.", effect: s => { s.trust += 0.05; } }, 
      { text: "Cover up.", effect: s => { s.trust -= 0.10; } },
      { text: "Exile them.", effect: s => { s.trust += 0.10; s.advisors.kael -= 10; } }
    ] 
  },
  { 
    id: 'e20', 
    text: "SITUATION: CRYPTO SCAM\nCharity funds stolen.", 
    choices: [
      { text: "Compensate victims.", effect: s => { s.economy -= 0.05; s.trust += 0.05; } }, 
      { text: "Investigation only.", effect: s => { s.trust -= 0.05; } },
      { text: "Hire hackers to steal it back.", effect: s => { s.economy += 0.05; s.trust -= 0.05; } }
    ] 
  },
  { 
    id: 'e21', 
    text: "SITUATION: RELIGIOUS CULT\nClaiming immunity through prayer.", 
    choices: [
      { text: "Raid compound.", effect: s => { s.trust -= 0.10; s.population -= 0.01; } }, 
      { text: "Ignore.", effect: s => { s.infection += 0.03; } },
      { text: "Infiltrate with spies.", effect: s => { s.economy -= 0.02; s.infection -= 0.01; } }
    ] 
  },
  { 
    id: 'e22', 
    text: "SITUATION: OIL SPILL\nTanker crash near capital.", 
    choices: [
      { text: "Clean up.", effect: s => { s.economy -= 0.05; } }, 
      { text: "Focus on virus.", effect: s => { s.trust -= 0.05; } },
      { text: "Burn the slick.", effect: s => { s.population -= 0.01; s.economy -= 0.01; } }
    ] 
  },
  { 
    id: 'e23', 
    text: "SITUATION: ZOO BREAKOUT\nAnimals starving.", 
    choices: [
      { text: "Feed them.", effect: s => { s.economy -= 0.01; } }, 
      { text: "Euthanize.", effect: s => { s.trust -= 0.05; } },
      { text: "Release into wild.", effect: s => { s.trust += 0.02; s.population -= 0.01; } }
    ] 
  },
  { 
    id: 'e24', 
    text: "SITUATION: HACKER GROUP\nThreatening to delete debt data.", 
    choices: [
      { text: "Let them (Chaos).", effect: s => { s.economy -= 0.20; s.trust += 0.10; } }, 
      { text: "Cyber defense.", effect: s => { s.economy -= 0.05; } },
      { text: "Blackmail them.", effect: s => { s.trust -= 0.05; s.economy += 0.05; } }
    ] 
  },
  { 
    id: 'e25', 
    text: "SITUATION: WILDFIRES\nSpreading near suburbs.", 
    choices: [
      { text: "Evacuate.", effect: s => { s.infection += 0.05; } }, 
      { text: "Stay put.", effect: s => { s.population -= 0.01; } },
      { text: "Use experimental chemicals.", effect: s => { s.population -= 0.02; s.economy -= 0.02; } }
    ] 
  },
  { 
    id: 'e26', 
    text: "SITUATION: DIPLOMATIC INSULT\nPresident insulted ally.", 
    choices: [
      { text: "Apologize.", effect: s => { s.trust -= 0.02; } }, 
      { text: "Double down.", effect: s => { s.economy -= 0.05; s.trust += 0.05; } },
      { text: "Ignore it.", effect: s => { s.trust -= 0.05; } }
    ] 
  },
  { 
    id: 'e27', 
    text: "SITUATION: SPORTING EVENT\nChampionship game scheduled.", 
    choices: [
      { text: "Cancel.", effect: s => { s.trust -= 0.05; s.economy -= 0.05; } }, 
      { text: "Play.", effect: s => { s.infection += 0.10; s.economy += 0.05; } },
      { text: "Empty Stadium (Televise only).", effect: s => { s.economy -= 0.02; s.trust += 0.02; } }
    ] 
  },
  { 
    id: 'e28', 
    text: "SITUATION: RENT STRIKE\nTenants refusing to pay.", 
    choices: [
      { text: "Evict them.", effect: s => { s.trust -= 0.15; s.population -= 0.01; } }, 
      { text: "Freeze rent.", effect: s => { s.economy -= 0.10; s.trust += 0.05; } },
      { text: "Universal Basic Income trial.", effect: s => { s.economy -= 0.15; s.trust += 0.15; } }
    ] 
  },
  { 
    id: 'e29', 
    text: "SITUATION: ROGUE SCIENTIST\nExperimenting on homeless.", 
    choices: [
      { text: "Use his data.", effect: s => { s.flags.cure_progress += 10; s.trust -= 0.10; } }, 
      { text: "Arrest him.", effect: s => { s.trust += 0.05; } },
      { text: "Fund him secretly.", effect: s => { s.economy -= 0.05; s.flags.cure_progress += 15; s.trust -= 0.15; } }
    ] 
  },
  { 
    id: 'e30', 
    text: "SITUATION: BORDER WALL\nPeople trying to break out.", 
    choices: [
      { text: "Shoot to kill.", effect: s => { s.trust -= 0.20; s.population -= 0.01; } }, 
      { text: "Let them go.", effect: s => { s.economy -= 0.05; } },
      { text: "Tear gas and rubber bullets.", effect: s => { s.trust -= 0.10; } }
    ] 
  },
  { 
    id: 'e31', 
    text: "SITUATION: GOLD RESERVES\nSell to buy medicine?", 
    choices: [
      { text: "Sell.", effect: s => { s.economy += 0.10; s.trust -= 0.05; } }, 
      { text: "Hold.", effect: s => { s.healthcare_load += 0.05; } },
      { text: "Take out IMF loans instead.", effect: s => { s.economy += 0.05; s.trust -= 0.05; } }
    ] 
  },
  { 
    id: 'e32', 
    text: "SITUATION: SATELLITE CRASH\nDebris in city.", 
    choices: [
      { text: "Salvage.", effect: s => { s.economy += 0.02; } }, 
      { text: "Cordon off.", effect: s => { s.trust -= 0.01; } },
      { text: "Ignore.", effect: s => { s.population -= 0.01; } }
    ] 
  },
  { 
    id: 'e33', 
    text: "SITUATION: ANCIENT REMEDY\nFake herb causing poisoning.", 
    choices: [
      { text: "Ban it.", effect: s => { s.trust -= 0.05; } }, 
      { text: "PSA campaign.", effect: s => { s.economy -= 0.01; } },
      { text: "Tax it.", effect: s => { s.economy += 0.01; s.population -= 0.01; } }
    ] 
  },
  { 
    id: 'e34', 
    text: "SITUATION: MASS DESERTION\nSoldiers leaving posts.", 
    choices: [
      { text: "Court martial.", effect: s => { s.trust -= 0.10; } }, 
      { text: "Bribe them.", effect: s => { s.economy -= 0.05; } },
      { text: "Execute ringleaders.", effect: s => { s.trust -= 0.20; s.flags.militarized = true; } }
    ] 
  },
  { 
    id: 'e35', 
    text: "SITUATION: GHOST TOWNS\nSmall towns completely dead.", 
    choices: [
      { text: "Burn them.", effect: s => { s.infection -= 0.02; s.trust -= 0.05; } }, 
      { text: "Seal them.", effect: s => { s.trust -= 0.01; } },
      { text: "Loot for supplies.", effect: s => { s.economy += 0.02; s.trust -= 0.10; } }
    ] 
  }
];

// ==========================================
// 6. CONTENT FETCHING
// ==========================================

const storyArcs = {
  main: {
    1: { text: "DAY 1: PATIENT ZERO\nGeneral Kael wants to lock down the sector. Dr. Aris wants to assess.", choices: [{ text: "[KAEL] Lockdown.", effect: s => { s.infection -= 0.02; s.trust -= 0.05; modifyLoyalty('kael', 10); } }, { text: "[ARIS] Assess first.", effect: s => { s.trust += 0.05; s.economy -= 0.02; modifyLoyalty('aris', 10); } }, { text: "Do nothing (Wait).", effect: s => { s.infection += 0.01; } }] },
    5: { text: "DAY 5: CONTAINMENT BREACH\nVirus crossed state lines.", choices: [{ text: "[KAEL] Close domestic borders.", effect: s => { s.flags.border_closed = true; s.economy -= 0.15; modifyLoyalty('kael', 10); } }, { text: "[ARIS] Screen travelers.", effect: s => { s.infection += 0.08; modifyLoyalty('aris', 10); } }, { text: "Shutdown Airports only.", effect: s => { s.economy -= 0.05; s.infection += 0.02; } }] },
    12: { text: "DAY 12: THE SHORTAGE\nOut of ventilators.", choices: [{ text: "[KAEL] Prioritize workers.", effect: s => { s.trust -= 0.15; modifyLoyalty('kael', 15); } }, { text: "[ARIS] Lottery system.", effect: s => { s.trust += 0.05; modifyLoyalty('aris', 10); } }, { text: "Bid for supplies on black market.", effect: s => { s.economy -= 0.10; } }] },
    18: { text: "DAY 18: VACCINE TRIALS\nRisky prototype ready.", choices: [{ text: "[ARIS] Human testing.", effect: s => { s.flags.cure_progress += 35; s.trust -= 0.10; modifyLoyalty('aris', 20); } }, { text: "Wait for animals.", effect: s => { s.flags.cure_progress += 5; s.population -= 0.05; } }, { text: "Test on military volunteers.", effect: s => { s.flags.cure_progress += 20; s.flags.militarized = true; } }] }
  }
};

function getDailyContent() {
  if (state.day > 25) return { 
    text: "SURVIVAL MODE: PERSISTENCE", 
    choices: [
      { text: "Booster Shot.", effect: s => s.economy-=0.1 }, 
      { text: "Total Lockdown.", effect: s => s.flags.lockdown=true },
      { text: "Ignore.", effect: s => s.infection+=0.05 }
    ] 
  };

  // 1. CHECK BALANCING (Lifelines)
  const balanceEvent = balancingEvents.find(e => e.condition(state) && !state.usedEvents.includes(e.id));
  if (balanceEvent) {
    state.usedEvents.push(balanceEvent.id);
    return balanceEvent;
  }

  // 2. CHECK MUTATION ARC
  if (state.infection > 0.30 && !state.usedEvents.includes('mut_1') && Math.random() > 0.6) {
    state.usedEvents.push('mut_1');
    return mutationEvents.find(e => e.id === 'mut_1');
  }
  if (state.usedEvents.includes('mut_1') && !state.usedEvents.includes('mut_2') && state.day > 15) {
    state.usedEvents.push('mut_2');
    return mutationEvents.find(e => e.id === 'mut_2');
  }

  // 3. MAIN STORY
  if (storyArcs.main[state.day]) return storyArcs.main[state.day];

  // 4. RANDOM POOL
  const availableEvents = eventPool.filter(e => !state.usedEvents.includes(e.id));
  if (availableEvents.length > 0) {
    const evt = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    state.usedEvents.push(evt.id);
    return evt;
  }

  // Fallback
  return { 
    text: "STATUS: WAITING PATTERN\nNo major incidents reported.", 
    choices: [
      { text: "Fortify Economy.", effect: s => s.economy+=0.02 }, 
      { text: "Boost Health.", effect: s => s.healthcare_load-=0.02 },
      { text: "Broadcast Hope.", effect: s => s.trust+=0.02 }
    ] 
  };
}

// ==========================================
// 7. ENDINGS & TRIGGERS
// ==========================================

function triggerInterruption(title, text, choices) {
  state.activeInterruption = { text: `*** ${title} ***\n${text}`, choices: choices };
}

function checkEnding() {
  // VICTORY
  if (state.infection <= 0 || (state.flags.cure_progress >= 100 && state.infection < 0.2)) {
    return "ENDING: VIRUS ERADICATED\nScience and sacrifice have prevailed. The pandemic is over. Humanity breathes again.";
  }
  // DEFEAT
  if (state.population < 0.15) return "ENDING: EXTINCTION\nSilence falls over the cities.";
  if (state.economy < 0.10) return "ENDING: FAILED STATE\nMoney is worthless. Warlords rule.";
  if (state.trust < 0.10) return "ENDING: REVOLUTION\nThe guillotine awaits you.";
  if (state.healthcare_load >= 1.0 && state.infection > 0.60) return "ENDING: SYSTEM FAILURE\nThe sick have nowhere to go.";
  return null;
}

// ==========================================
// 8. PUBLIC API
// ==========================================

function getStatusReport() {
  normalizeState();
  return `
REPORT - DAY ${state.day}
------------------------------------
POPULATION: ${(state.population * 100).toFixed(0)}% | TRUST:     ${(state.trust * 100).toFixed(0)}%
ECONOMY:    ${(state.economy * 100).toFixed(0)}% | INFECTION: ${(state.infection * 100).toFixed(0)}%
HEALTHCARE: ${(state.healthcare_load * 100).toFixed(0)}% LOAD
------------------------------------
`;
}

function advanceDay(choiceIndex = null) {
  let output = [];
  let newsHeadline = null;

  if (choiceIndex !== null) {
    if (!state.currentScenario) state.currentScenario = getDailyContent();
    let choices = state.activeInterruption ? state.activeInterruption.choices : state.currentScenario.choices;
    
    if (choices[choiceIndex]) {
      output.push(`>> ACTION: ${choices[choiceIndex].text}`);
      choices[choiceIndex].effect(state);
      if (state.activeInterruption) state.activeInterruption = null;
      else { runDailySimulation(); state.day++; state.currentScenario = null; }
    }
  }

  if (!state.currentScenario && !state.activeInterruption) state.currentScenario = getDailyContent();
  if (state.population < 0.70) state.flags.criticalMode = true; else state.flags.criticalMode = false;

  newsHeadline = checkNews();
  const ending = checkEnding();
  if (ending) return { text: ending, choices: 0, ended: true, critical: state.flags.criticalMode, news: newsHeadline };

  output.push(getStatusReport());
  let scene = state.activeInterruption ? state.activeInterruption : state.currentScenario;
  output.push(scene.text);
  output.push("");
  scene.choices.forEach((c, i) => output.push(`[${i + 1}] ${c.text}`));

  return { text: output.join("\n"), choices: scene.choices.length, ended: false, critical: state.flags.criticalMode, news: newsHeadline };
}
