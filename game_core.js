/**
 * PANDEMIC DIRECTIVE: ZERO HOUR
 * Core logic update- serious and balanced
 */

// 1. Game state

let state = {
  day: 1,
  // Stats
  population: 1.0, economy: 0.80, trust: 0.70,
  infection: 0.05, healthcare_load: 0.10,

  // Advisors
  advisors: { kael: 50, aris: 50 },

  // Tracking
  arc: 'main', arcProgress: 0,
  usedEvents: [], // IDs of events already seen
  usedNews: [],   // IDs of news already seen
  
  // Flags
  flags: {
    criticalMode: false, lockdown: false, militarized: false,
    cure_progress: 0, sterility: false, border_closed: false,
    media_censored: false, kael_rebelled: false, aris_resigned: false
  },

  // Temp Holders
  activeInterruption: null, currentScenario: null
};

// 2. Math and helpers

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

// 3. Simulation engine

function runDailySimulation() {
  let spreadRate = 0.15; 
  if (state.flags.lockdown) spreadRate -= 0.12;
  if (state.trust < 0.4) spreadRate += 0.06;
  if (state.healthcare_load > 0.9) spreadRate += 0.05; 
  
  let growth = spreadRate * state.infection * (1 - state.infection);
  state.infection += growth + noise(0.01);

  let targetLoad = state.infection * 1.3;
  state.healthcare_load += (targetLoad - state.healthcare_load) * 0.25;
  state.healthcare_load += 0.01;

  let ecoDecay = 0.005;
  if (state.flags.lockdown) ecoDecay += 0.03;
  if (state.infection > 0.3) ecoDecay += 0.02;
  state.economy -= ecoDecay;

  let mortalityRate = 0.001 + (state.infection * 0.015);
  if (state.healthcare_load > 0.95) mortalityRate += 0.03;
  state.population -= mortalityRate;

  if (state.economy < 0.3) state.trust -= 0.02;
  if (state.population < 0.85) state.trust -= 0.03;

  // Advisor Checks
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

  normalizeState();
}

// 4. News Headline system

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
  { id: 'n23', text: "TECH: AI Predicts 90% Probability of Collapse", condition: s => s.economy < 0.2 }
];

function checkNews() {
  // PROBABILITY CHECK: 75% chance to skip news even if valid
  if (Math.random() < 0.75) return null;

  // Find valid news that hasn't been shown
  const candidates = newsPool.filter(n => !state.usedNews.includes(n.id) && n.condition(state));
  
  if (candidates.length > 0) {
    const news = candidates[Math.floor(Math.random() * candidates.length)];
    state.usedNews.push(news.id);
    return news.text;
  }
  return null;
}

// 5. Event pool

const eventPool = [
  { id: 'e1', text: "SITUATION: OXYGEN LEAK\nA main oxygen tank at Central Hospital has ruptured.", choices: [{ text: "Divert industrial oxygen (Hurt Eco).", effect: s => { s.economy -= 0.05; s.healthcare_load -= 0.05; } }, { text: "Ration oxygen (Deaths).", effect: s => { s.population -= 0.01; s.trust -= 0.05; } }] },
  { id: 'e2', text: "SITUATION: PRISON OUTBREAK\nInfection spreading in maximum security.", choices: [{ text: "Release non-violent offenders.", effect: s => { s.trust -= 0.10; s.infection += 0.02; } }, { text: "Lock them in.", effect: s => { s.trust -= 0.05; } }] },
  { id: 'e3', text: "SITUATION: TRANSPORT STRIKE\nTruckers refuse to drive into infected zones.", choices: [{ text: "Triple hazard pay.", effect: s => { s.economy -= 0.08; s.trust += 0.02; } }, { text: "Military drivers.", effect: s => { s.flags.militarized = true; s.trust -= 0.05; } }] },
  { id: 'e4', text: "SITUATION: CELEBRITY INFLUENCER\nA pop star is telling fans the virus is a hoax.", choices: [{ text: "Publicly arrest them.", effect: s => { s.trust += 0.05; s.trust -= 0.10; } }, { text: "Ignore it.", effect: s => { s.infection += 0.05; } }] },
  { id: 'e5', text: "SITUATION: BLACK MARKET\nGangs are selling stolen medicine.", choices: [{ text: "Raids (Violent).", effect: s => { s.trust -= 0.05; s.economy += 0.02; } }, { text: "Buy it back.", effect: s => { s.economy -= 0.10; s.healthcare_load -= 0.05; } }] },
  { id: 'e6', text: "SITUATION: FOREIGN SPIES\nAgents caught trying to steal vaccine data.", choices: [{ text: "Execute them.", effect: s => { s.trust += 0.05; s.economy -= 0.05; } }, { text: "Trade for supplies.", effect: s => { s.healthcare_load -= 0.10; s.trust -= 0.10; } }] },
  { id: 'e7', text: "SITUATION: BANK RUN\nPeople draining ATMs.", choices: [{ text: "Freeze withdrawals.", effect: s => { s.trust -= 0.15; s.economy += 0.05; } }, { text: "Print money.", effect: s => { s.economy -= 0.15; } }] },
  { id: 'e8', text: "SITUATION: TEACHERS UNION\nThey refuse to open schools.", choices: [{ text: "Close schools.", effect: s => { s.economy -= 0.05; s.infection -= 0.03; } }, { text: "Fire them.", effect: s => { s.trust -= 0.10; s.infection += 0.05; } }] },
  { id: 'e9', text: "SITUATION: BORDER REFUGEES\nThousands fleeing neighbor state.", choices: [{ text: "Let them in.", effect: s => { s.infection += 0.10; s.trust += 0.05; } }, { text: "Turn them back.", effect: s => { s.trust -= 0.05; } }] },
  { id: 'e10', text: "SITUATION: DATA CENTER FIRE\nWe lost tracking data.", choices: [{ text: "Estimate (Guess).", effect: s => { s.trust -= 0.05; } }, { text: "Divert funds to rebuild.", effect: s => { s.economy -= 0.05; } }] },
  { id: 'e11', text: "SITUATION: MASK PRICE GOUGING\nPharmacy chains increasing prices 500%.", choices: [{ text: "Seize the stock.", effect: s => { s.trust += 0.05; s.economy -= 0.02; } }, { text: "Free market.", effect: s => { s.trust -= 0.10; s.economy += 0.01; } }] },
  { id: 'e12', text: "SITUATION: ABANDONED PETS\nStray dogs forming packs in cities.", choices: [{ text: "Cull them.", effect: s => { s.trust -= 0.05; } }, { text: "Ignore.", effect: s => { s.infection += 0.01; } }] },
  { id: 'e13', text: "SITUATION: WATER SHORTAGE\nTreatment plant failure.", choices: [{ text: "Fix immediately.", effect: s => { s.economy -= 0.08; } }, { text: "Ration water.", effect: s => { s.trust -= 0.10; } }] },
  { id: 'e14', text: "SITUATION: INTERNET OUTAGE\nRumors of a cyber attack.", choices: [{ text: "Blame terrorists.", effect: s => { s.trust += 0.02; s.flags.militarized = true; } }, { text: "Admit infrastructure failure.", effect: s => { s.trust -= 0.05; } }] },
  { id: 'e15', text: "SITUATION: MILITIA RISING\nArmed citizens patrolling streets.", choices: [{ text: "Deputize them.", effect: s => { s.trust -= 0.10; s.flags.militarized = true; } }, { text: "Disarm them.", effect: s => { s.population -= 0.01; s.trust -= 0.05; } }] },
  { id: 'e16', text: "SITUATION: FARMER PROTEST\nFood production halting.", choices: [{ text: "Subsidies.", effect: s => { s.economy -= 0.05; s.trust += 0.02; } }, { text: "Import food.", effect: s => { s.economy -= 0.10; } }] },
  { id: 'e17', text: "SITUATION: CRUISE SHIP\nInfected ship wants to dock.", choices: [{ text: "Allow docking.", effect: s => { s.infection += 0.05; s.trust += 0.05; } }, { text: "Refuse.", effect: s => { s.trust -= 0.05; } }] },
  { id: 'e18', text: "SITUATION: WASTE BUILDUP\nGarbage piling up.", choices: [{ text: "Burn it.", effect: s => { s.trust -= 0.05; } }, { text: "Army clean up.", effect: s => { s.flags.militarized = true; } }] },
  { id: 'e19', text: "SITUATION: SENATOR SCANDAL\nSenator caught at a party.", choices: [{ text: "Resignation.", effect: s => { s.trust += 0.05; } }, { text: "Cover up.", effect: s => { s.trust -= 0.10; } }] },
  { id: 'e20', text: "SITUATION: CRYPTO SCAM\nCharity funds stolen.", choices: [{ text: "Compensate victims.", effect: s => { s.economy -= 0.05; s.trust += 0.05; } }, { text: "Investigation only.", effect: s => { s.trust -= 0.05; } }] },
  { id: 'e21', text: "SITUATION: RELIGIOUS CULT\nClaiming immunity through prayer.", choices: [{ text: "Raid compound.", effect: s => { s.trust -= 0.10; s.population -= 0.01; } }, { text: "Ignore.", effect: s => { s.infection += 0.03; } }] },
  { id: 'e22', text: "SITUATION: OIL SPILL\nTanker crash near capital.", choices: [{ text: "Clean up.", effect: s => { s.economy -= 0.05; } }, { text: "Focus on virus.", effect: s => { s.trust -= 0.05; } }] },
  { id: 'e23', text: "SITUATION: ZOO BREAKOUT\nAnimals starving.", choices: [{ text: "Feed them.", effect: s => { s.economy -= 0.01; } }, { text: "Euthanize.", effect: s => { s.trust -= 0.05; } }] },
  { id: 'e24', text: "SITUATION: HACKER GROUP\nThreatening to delete debt data.", choices: [{ text: "Let them.", effect: s => { s.economy -= 0.20; s.trust += 0.10; } }, { text: "Cyber defense.", effect: s => { s.economy -= 0.05; } }] },
  { id: 'e25', text: "SITUATION: WILDFIRES\nSpreading near suburbs.", choices: [{ text: "Evacuate.", effect: s => { s.infection += 0.05; } }, { text: "Stay put.", effect: s => { s.population -= 0.01; } }] },
  { id: 'e26', text: "SITUATION: DIPLOMATIC INSULT\nPresident insulted ally.", choices: [{ text: "Apologize.", effect: s => { s.trust -= 0.02; } }, { text: "Double down.", effect: s => { s.economy -= 0.05; s.trust += 0.05; } }] },
  { id: 'e27', text: "SITUATION: SPORTING EVENT\nChampionship game scheduled.", choices: [{ text: "Cancel.", effect: s => { s.trust -= 0.05; s.economy -= 0.05; } }, { text: "Play.", effect: s => { s.infection += 0.10; s.economy += 0.05; } }] },
  { id: 'e28', text: "SITUATION: RENT STRIKE\nTenants refusing to pay.", choices: [{ text: "Evict them.", effect: s => { s.trust -= 0.15; s.population -= 0.01; } }, { text: "Freeze rent.", effect: s => { s.economy -= 0.10; s.trust += 0.05; } }] },
  { id: 'e29', text: "SITUATION: ROGUE SCIENTIST\nExperimenting on homeless.", choices: [{ text: "Use his data.", effect: s => { s.flags.cure_progress += 10; s.trust -= 0.10; } }, { text: "Arrest him.", effect: s => { s.trust += 0.05; } }] },
  { id: 'e30', text: "SITUATION: BORDER WALL\nPeople trying to break out.", choices: [{ text: "Shoot to kill.", effect: s => { s.trust -= 0.20; s.population -= 0.01; } }, { text: "Let them go.", effect: s => { s.economy -= 0.05; } }] },
  { id: 'e31', text: "SITUATION: GOLD RESERVES\nSell to buy medicine?", choices: [{ text: "Sell.", effect: s => { s.economy += 0.10; s.trust -= 0.05; } }, { text: "Hold.", effect: s => { s.healthcare_load += 0.05; } }] },
  { id: 'e32', text: "SITUATION: SATELLITE CRASH\nDebris in city.", choices: [{ text: "Salvage.", effect: s => { s.economy += 0.02; } }, { text: "Cordon off.", effect: s => { s.trust -= 0.01; } }] },
  { id: 'e33', text: "SITUATION: ANCIENT REMEDY\nFake herb causing poisoning.", choices: [{ text: "Ban it.", effect: s => { s.trust -= 0.05; } }, { text: "PSA campaign.", effect: s => { s.economy -= 0.01; } }] },
  { id: 'e34', text: "SITUATION: MASS DESERTION\nSoldiers leaving posts.", choices: [{ text: "Court martial.", effect: s => { s.trust -= 0.10; } }, { text: "Bribe them.", effect: s => { s.economy -= 0.05; } }] },
  { id: 'e35', text: "SITUATION: GHOST TOWNS\nSmall towns completely dead.", choices: [{ text: "Burn them.", effect: s => { s.infection -= 0.02; s.trust -= 0.05; } }, { text: "Seal them.", effect: s => { s.trust -= 0.01; } }] }
];

// 6. Content fetching system

const storyArcs = {
  main: {
    1: { text: "DAY 1: PATIENT ZERO\nGeneral Kael wants to lock down the sector. Dr. Aris wants to assess.", choices: [{ text: "[KAEL] Lockdown.", effect: s => { s.infection -= 0.02; s.trust -= 0.05; modifyLoyalty('kael', 10); } }, { text: "[ARIS] Assess first.", effect: s => { s.trust += 0.05; s.economy -= 0.02; modifyLoyalty('aris', 10); } }] },
    5: { text: "DAY 5: CONTAINMENT BREACH\nVirus crossed state lines.", choices: [{ text: "[KAEL] Close domestic borders.", effect: s => { s.flags.border_closed = true; s.economy -= 0.15; modifyLoyalty('kael', 10); } }, { text: "[ARIS] Screen travelers.", effect: s => { s.infection += 0.08; modifyLoyalty('aris', 10); } }] },
    12: { text: "DAY 12: THE SHORTAGE\nOut of ventilators.", choices: [{ text: "[KAEL] Prioritize workers.", effect: s => { s.trust -= 0.15; modifyLoyalty('kael', 15); } }, { text: "[ARIS] Lottery system.", effect: s => { s.trust += 0.05; modifyLoyalty('aris', 10); } }] },
    18: { text: "DAY 18: VACCINE TRIALS\nRisky prototype ready.", choices: [{ text: "[ARIS] Human testing.", effect: s => { s.flags.cure_progress += 35; s.trust -= 0.10; modifyLoyalty('aris', 20); } }, { text: "Wait for animals.", effect: s => { s.flags.cure_progress += 5; s.population -= 0.05; } }] }
  }
};

function getDailyContent() {
  if (state.day > 25) return { text: "SURVIVAL MODE: MUTATION", choices: [{ text: "Booster", effect: s => s.economy-=0.1}, {text: "Lockdown", effect: s => s.flags.lockdown=true}] };

  // 1. Check Main Story
  if (storyArcs.main[state.day]) return storyArcs.main[state.day];

  // 2. Random Event (Non-repeating)
  const availableEvents = eventPool.filter(e => !state.usedEvents.includes(e.id));
  
  if (availableEvents.length > 0) {
    const evt = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    state.usedEvents.push(evt.id);
    return evt;
  }

  // Fallback
  return { text: "STATUS: QUIET DAY\nNo major incidents reported.", choices: [{ text: "Fortify Economy", effect: s => s.economy+=0.02}, {text: "Boost Health", effect: s=>s.healthcare_load-=0.02}] };
}

// 7. Endings and triggers

function triggerInterruption(title, text, choices) {
  state.activeInterruption = { text: `*** ${title} ***\n${text}`, choices: choices };
}

function checkEnding() {
  if (state.population < 0.15) return "ENDING: EXTINCTION\nSilence falls over the cities.";
  if (state.economy < 0.10) return "ENDING: FAILED STATE\nMoney is worthless. Warlords rule.";
  if (state.trust < 0.10) return "ENDING: REVOLUTION\nThe guillotine awaits you.";
  if (state.healthcare_load >= 1.0 && state.infection > 0.60) return "ENDING: SYSTEM FAILURE\nThe sick have nowhere to go.";
  return null;
}

// 8. Public API

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

  // 1. Process Input
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

  // 2. New Content
  if (!state.currentScenario && !state.activeInterruption) state.currentScenario = getDailyContent();
  if (state.population < 0.70) state.flags.criticalMode = true; else state.flags.criticalMode = false;

  // 3. News Check
  newsHeadline = checkNews();

  // 4. Endings
  const ending = checkEnding();
  if (ending) return { text: ending, choices: 0, ended: true, critical: state.flags.criticalMode, news: newsHeadline };

  // 5. Output Construction
  output.push(getStatusReport());
  let scene = state.activeInterruption ? state.activeInterruption : state.currentScenario;
  output.push(scene.text);
  output.push("");
  scene.choices.forEach((c, i) => output.push(`[${i + 1}] ${c.text}`));

  return { text: output.join("\n"), choices: scene.choices.length, ended: false, critical: state.flags.criticalMode, news: newsHeadline };
}
