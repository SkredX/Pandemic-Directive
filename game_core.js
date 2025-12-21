// world state

const state = {
  day: 1,

  infection: 0.04,
  mortality: 0.02,
  trust: 0.6,
  economy: 0.75,
  healthcare: 0.85,
  unrest: 0.1,

  population: 1.0,
  cost: 0,

  flags: {},
  delayed: []
};

// utility

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function noise(scale = 0.03) {
  return (Math.random() - 0.5) * scale;
}

function queue(days, fn) {
  state.delayed.push({ day: state.day + days, fn });
}

function resolveDelayed() {
  state.delayed
    .filter(e => e.day <= state.day)
    .forEach(e => e.fn());
  state.delayed = state.delayed.filter(e => e.day > state.day);
}

// daily system dynamics

function updateInfection() {
  const growth = 1 + state.infection * 0.6;
  state.infection *= growth;
  state.infection += noise(0.02);
}

function updatePopulation() {
  const deaths = state.infection * state.mortality * 0.05;
  state.population -= deaths;
}

function updateEconomy() {
  state.economy -= state.infection * 0.03;
  state.economy -= state.unrest * 0.04;
  state.economy += noise(0.02);
}

function updateHealthcare() {
  state.healthcare -= state.infection * 0.025;
}

function updateTrust() {
  state.trust -= state.unrest * 0.03;
  state.trust += noise(0.02);
}

function dailyUpdate() {
  updateInfection();
  updatePopulation();
  updateEconomy();
  updateHealthcare();
  updateTrust();

  state.cost += state.infection * 60;

  resolveDelayed();

  state.infection = clamp(state.infection);
  state.population = clamp(state.population);
  state.economy = clamp(state.economy);
  state.healthcare = clamp(state.healthcare);
  state.trust = clamp(state.trust);
  state.unrest = clamp(state.unrest);
}

// daily status report

function dailyReport() {
  return `
Population remaining: ${(state.population * 100).toFixed(1)}%
Economic stability: ${(state.economy * 100).toFixed(1)}%
Healthcare capacity: ${(state.healthcare * 100).toFixed(1)}%
Public trust: ${(state.trust * 100).toFixed(1)}%
Infection spread: ${(state.infection * 100).toFixed(1)}%
`;
}

// micro choices

function minorDecision() {
  return {
    text: "A routine policy adjustment is required.",
    choices: [
      {
        text: "Prioritize economic continuity",
        apply: () => {
          state.economy += 0.03;
          state.infection += 0.04;
        }
      },
      {
        text: "Prioritize health precautions",
        apply: () => {
          state.infection -= 0.02;
          state.trust -= 0.02;
        }
      },
      {
        text: "Avoid intervention",
        apply: () => {
          state.unrest += 0.03;
        }
      }
    ]
  };
}

// major choices

function majorDecision(day) {
  const map = {
    1: {
      text: "Early reports confirm a novel pathogen.",
      choices: [
        {
          text: "Disclose information immediately",
          apply: () => {
            state.trust += 0.08;
            state.infection += 0.02;
          }
        },
        {
          text: "Delay public announcement",
          apply: () => {
            queue(4, () => state.infection *= 2);
          }
        }
      ]
    },

    5: {
      text: "Corporate interests request emergency deregulation.",
      choices: [
        {
          text: "Approve deregulation",
          apply: () => {
            state.economy += 0.06;
            state.infection += 0.06;
            state.flags.deregulated = true;
          }
        },
        {
          text: "Reject request",
          apply: () => {
            state.unrest += 0.05;
            state.economy -= 0.04;
          }
        }
      ]
    },

    10: {
      text: "Hospitals request authority to triage aggressively.",
      choices: [
        {
          text: "Authorize triage",
          apply: () => {
            state.healthcare += 0.1;
            state.trust -= 0.15;
            state.flags.triage = true;
          }
        },
        {
          text: "Maintain equal care",
          apply: () => {
            state.mortality += 0.05;
          }
        }
      ]
    },

    15: {
      text: "Protests intensify across urban centers.",
      choices: [
        {
          text: "Deploy security forces",
          apply: () => {
            state.unrest -= 0.1;
            state.trust -= 0.2;
            state.flags.militarized = true;
          }
        },
        {
          text: "Allow protests",
          apply: () => {
            state.unrest += 0.15;
            state.economy -= 0.08;
          }
        }
      ]
    },

    20: {
      text: "Vaccine research shows promise.",
      choices: [
        {
          text: "Fund open collaboration",
          apply: () => {
            state.mortality -= 0.05;
            state.cost += 300;
          }
        },
        {
          text: "Grant exclusive patents",
          apply: () => {
            state.flags.patents = true;
            queue(7, () => state.mortality += 0.08);
          }
        }
      ]
    },

    25: {
      text: "A region could be sealed to stop spread.",
      choices: [
        {
          text: "Authorize regional sacrifice",
          apply: () => {
            state.population -= 0.2;
            state.infection -= 0.3;
            state.trust -= 0.3;
            state.flags.sacrifice = true;
          }
        },
        {
          text: "Reject proposal",
          apply: () => {
            state.infection += 0.2;
          }
        }
      ]
    }
  };

  return map[day];
}

// endings

function checkEnding() {
  if (state.day < 16) return null;

  if (state.population < 0.25)
    return "HUMAN EXTINCTION";

  if (
    state.infection < 0.08 &&
    state.mortality < 0.2 &&
    !state.flags.sacrifice &&
    !state.flags.patents &&
    !state.flags.militarized
  )
    return "CONTROLLED ERADICATION";

  if (state.economy < 0.1)
    return "COUNTRY COLLAPSE";

  if (state.trust < 0.15)
    return "GENERATIONAL TRAUMA";

  return null;
}

// game step api

function advanceDay(choiceIndex = null) {
  let output = [];
  output.push("──────────────────────────────");
  output.push(`DAY ${state.day}`);
  output.push(dailyReport());

  dailyUpdate();

  let event = majorDecision(state.day) || minorDecision();

  output.push(event.text);
  output.push("");

  event.choices.forEach((c, i) => {
    output.push(`${i + 1}) ${c.text}`);
  });

  if (choiceIndex !== null && event.choices[choiceIndex]) {
    event.choices[choiceIndex].apply();
  }

  const ending = checkEnding();
  state.day += 1;

  if (ending) {
    output.push("");
    output.push("================================");
    output.push(`ENDING REACHED: ${ending}`);
  }

  return {
    text: output.join("\n"),
    choices: event.choices.length,
    ended: Boolean(ending)
  };
}
