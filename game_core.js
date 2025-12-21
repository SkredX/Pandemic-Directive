// world state

const state = {
  day: 1,

  global_infection: 0.03,
  mortality_rate: 0.015,
  public_trust: 0.6,
  economic_stability: 0.75,
  healthcare_capacity: 0.85,
  civil_unrest: 0.1,

  population: 1.0,
  cumulative_cost: 0.0,

  flags: {},
  delayed_effects: []
};

function clampState() {
  [
    "global_infection",
    "mortality_rate",
    "public_trust",
    "economic_stability",
    "healthcare_capacity",
    "civil_unrest",
    "population"
  ].forEach(k => {
    state[k] = Math.max(0, Math.min(1, state[k]));
  });
}

// chaos engine

function chaosNoise(scale = 0.03) {
  return (Math.random() - 0.5) * scale;
}

function queueDelayedEffect(daysAhead, fn) {
  state.delayed_effects.push({
    triggerDay: state.day + daysAhead,
    fn
  });
}

function resolveDelayedEffects() {
  const ready = state.delayed_effects.filter(e => e.triggerDay <= state.day);
  ready.forEach(e => e.fn());
  state.delayed_effects = state.delayed_effects.filter(e => e.triggerDay > state.day);
}

function naturalProgression() {
  const spreadFactor = 1 + state.global_infection * 0.7;
  state.global_infection *= spreadFactor;

  const deaths = state.global_infection * state.mortality_rate * 0.045;
  state.population -= deaths;

  state.healthcare_capacity -= state.global_infection * 0.02;
  state.economic_stability -= state.civil_unrest * 0.03;

  state.cumulative_cost += state.global_infection * 70;
}

// event definitions

function day1Event() {
  return {
    text: `Initial intelligence reports confirm a novel respiratory pathogen.
Transmission vectors are unclear.
Political leadership demands guidance.`,
    choices: [
      {
        text: "Release preliminary data immediately",
        apply: () => {
          state.public_trust += 0.07;
          state.global_infection += 0.015;
        }
      },
      {
        text: "Delay announcement pending verification",
        apply: () => {
          state.public_trust += 0.02;
          queueDelayedEffect(4, () => {
            state.global_infection *= 2.2;
          });
        }
      },
      {
        text: "Suppress all information temporarily",
        apply: () => {
          state.public_trust -= 0.15;
          state.flags.censored_media = true;
          queueDelayedEffect(6, () => {
            state.civil_unrest += 0.35;
          });
        }
      }
    ]
  };
}

function day4Event() {
  return {
    text: `Supply chains are destabilizing.
Private logistics firms request emergency deregulation.`,
    choices: [
      {
        text: "Deregulate immediately to stabilize supply",
        apply: () => {
          state.economic_stability += 0.05;
          state.global_infection += 0.04;
          state.flags.deregulated_supply = true;
        }
      },
      {
        text: "Maintain regulation despite shortages",
        apply: () => {
          state.public_trust -= 0.05;
          state.economic_stability -= 0.1;
          queueDelayedEffect(5, () => {
            state.civil_unrest += 0.2;
          });
        }
      }
    ]
  };
}

function day8Event() {
  return {
    text: `Hospitals are nearing capacity.
Doctors request authority to triage aggressively.`,
    choices: [
      {
        text: "Authorize aggressive triage protocols",
        apply: () => {
          state.healthcare_capacity += 0.1;
          state.public_trust -= 0.2;
          state.flags.triage_protocols = true;
        }
      },
      {
        text: "Preserve equal care standards",
        apply: () => {
          state.healthcare_capacity -= 0.15;
          state.mortality_rate += 0.05;
        }
      }
    ]
  };
}

function day12Event() {
  return {
    text: `Mass demonstrations erupt across major cities.
Security agencies warn of loss of control.`,
    choices: [
      {
        text: "Deploy military forces",
        apply: () => {
          state.civil_unrest -= 0.15;
          state.public_trust -= 0.35;
          state.flags.weaponized_quarantine = true;
          queueDelayedEffect(6, () => {
            state.public_trust -= 0.2;
          });
        }
      },
      {
        text: "Allow protests to continue",
        apply: () => {
          state.civil_unrest += 0.25;
          state.economic_stability -= 0.15;
        }
      }
    ]
  };
}

function day18Event() {
  return {
    text: `A vaccine candidate shows promise.
Pharmaceutical alliances demand exclusivity.`,
    choices: [
      {
        text: "Fund open scientific collaboration",
        apply: () => {
          state.cumulative_cost += 400;
          state.mortality_rate -= 0.04;
          state.public_trust += 0.1;
        }
      },
      {
        text: "Grant exclusive corporate patents",
        apply: () => {
          state.cumulative_cost -= 250;
          state.flags.sold_patents = true;
          queueDelayedEffect(8, () => {
            state.mortality_rate += 0.08;
          });
        }
      }
    ]
  };
}

function day25Event() {
  return {
    text: `Containment analysts propose isolating an entire region.
Evacuation is not feasible.`,
    choices: [
      {
        text: "Authorize total regional lockdown",
        apply: () => {
          state.global_infection -= 0.25;
          state.population -= 0.2;
          state.public_trust -= 0.45;
          state.flags.sacrificed_region = true;
        }
      },
      {
        text: "Reject the proposal",
        apply: () => {
          state.global_infection += 0.2;
          queueDelayedEffect(5, () => {
            state.healthcare_capacity -= 0.35;
          });
        }
      }
    ]
  };
}

function getEventForDay(day) {
  const map = {
    1: day1Event,
    4: day4Event,
    8: day8Event,
    12: day12Event,
    18: day18Event,
    25: day25Event
  };
  return map[day] ? map[day]() : null;
}

// endings

function checkEnding() {
  if (state.day < 30) return null;

  if (state.global_infection > 0.98 && state.healthcare_capacity < 0.1)
    return "HUMAN EXTINCTION";

  if (
    state.global_infection < 0.06 &&
    state.mortality_rate < 0.15 &&
    !state.flags.sold_patents &&
    !state.flags.sacrificed_region &&
    !state.flags.weaponized_quarantine
  )
    return "CONTROLLED ERADICATION";

  if (state.global_infection < 0.1 && state.economic_stability < 0.1)
    return "COUNTRY SACRIFICED";

  if (state.population < 0.5 || state.public_trust < 0.15)
    return "GENERATIONAL TRAUMA";

  return null;
}

// game step api

function advanceDay(choiceIndex = null) {
  let output = [];

  output.push("────────────────────────────────────");
  output.push(`DAY ${state.day}`);

  naturalProgression();

  const event = getEventForDay(state.day);
  if (event) {
    output.push(event.text);
    output.push("");
    event.choices.forEach((c, i) => {
      output.push(`${i + 1}) ${c.text}`);
    });

    if (choiceIndex !== null && event.choices[choiceIndex]) {
      event.choices[choiceIndex].apply();
    }
  } else {
    output.push("No major decisions today.");
  }

  resolveDelayedEffects();

  // Chaos perturbation
  state.global_infection += chaosNoise();
  state.public_trust += chaosNoise();
  state.economic_stability += chaosNoise();

  clampState();

  const ending = checkEnding();
  state.day += 1;

  if (ending) {
    output.push("");
    output.push("====================================");
    output.push(`ENDING REACHED: ${ending}`);
  }

  return {
    text: output.join("\n"),
    choices: event ? event.choices.length : 0,
    ended: Boolean(ending)
  };
}
