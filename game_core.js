// world state

const state = {
  day: 1,

  global_infection: 0.02,
  mortality_rate: 0.01,
  public_trust: 0.65,
  economic_stability: 0.75,
  healthcare_capacity: 0.8,
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

// butterfly effect engine

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
  const deaths = state.global_infection * state.mortality_rate * 0.03;
  state.population -= deaths;
  state.healthcare_capacity -= state.global_infection * 0.01;
  state.economic_stability -= state.civil_unrest * 0.02;
  state.cumulative_cost += state.global_infection * 50;
}

// events and choices

function day1Event() {
  return {
    text: `Initial reports indicate a novel respiratory pathogen.
Fatality data is uncertain.

Authorize public disclosure?`,
    choices: [
      {
        text: "Release preliminary data",
        apply: () => {
          state.public_trust += 0.05;
          state.global_infection += 0.01;
        }
      },
      {
        text: "Delay announcement",
        apply: () => {
          state.public_trust += 0.02;
          queueDelayedEffect(5, () => {
            state.global_infection *= 1.8;
          });
        }
      },
      {
        text: "Suppress information",
        apply: () => {
          state.public_trust -= 0.1;
          state.flags.censored_media = true;
          queueDelayedEffect(7, () => {
            state.civil_unrest += 0.25;
          });
        }
      }
    ]
  };
}

function day5Event() {
  return {
    text: `Pharmaceutical corporations offer rapid vaccine deployment
in exchange for exclusive global patents.`,
    choices: [
      {
        text: "Fund emergency vaccine trials",
        apply: () => {
          state.cumulative_cost += 300;
          state.mortality_rate -= 0.01;
          queueDelayedEffect(10, () => {
            state.public_trust -= 0.25;
          });
        }
      },
      {
        text: "Sell patents to stabilize economy",
        apply: () => {
          state.cumulative_cost -= 200;
          state.flags.sold_patents = true;
          queueDelayedEffect(8, () => {
            state.mortality_rate += 0.04;
          });
        }
      }
    ]
  };
}

function day12Event() {
  return {
    text: `Mass protests block hospital access.
Security forces demand authorization.`,
    choices: [
      {
        text: "Deploy military quarantine",
        apply: () => {
          state.civil_unrest -= 0.1;
          state.flags.weaponized_quarantine = true;
          queueDelayedEffect(6, () => {
            state.public_trust -= 0.3;
          });
        }
      },
      {
        text: "Negotiate with protest leaders",
        apply: () => {
          state.public_trust += 0.05;
          state.economic_stability -= 0.1;
          queueDelayedEffect(4, () => {
            state.civil_unrest += 0.2;
          });
        }
      }
    ]
  };
}

function day20Event() {
  return {
    text: `Sealing one major region could halt transmission.
Evacuation is impossible.`,
    choices: [
      {
        text: "Authorize total regional lockdown",
        apply: () => {
          state.global_infection -= 0.2;
          state.population -= 0.15;
          state.public_trust -= 0.4;
          state.flags.sacrificed_region = true;
        }
      },
      {
        text: "Refuse and preserve unity",
        apply: () => {
          state.global_infection += 0.15;
          queueDelayedEffect(5, () => {
            state.healthcare_capacity -= 0.3;
          });
        }
      }
    ]
  };
}

function getEventForDay(day) {
  if (day === 1) return day1Event();
  if (day === 5) return day5Event();
  if (day === 12) return day12Event();
  if (day === 20) return day20Event();
  return null;
}

// time gated endings

function checkEnding() {
  if (state.day < 25) return null;

  if (state.global_infection > 0.95 && state.healthcare_capacity < 0.1)
    return "HUMAN EXTINCTION";

  if (state.global_infection < 0.05 && state.economic_stability < 0.1)
    return "COUNTRY SACRIFICED";

  if (state.global_infection < 0.05 && state.mortality_rate < 0.2)
    return "CONTROLLED ERADICATION";

  if (state.global_infection < 0.3 && state.public_trust < 0.2)
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

    if (choiceIndex !== null) {
      event.choices[choiceIndex]?.apply();
    }
  } else {
    output.push("No major decisions today.");
  }

  resolveDelayedEffects();
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
