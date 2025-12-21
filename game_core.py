from dataclasses import dataclass, field

# world state

@dataclass
class WorldState:
    day: int = 1

    global_infection: float = 0.02
    mortality_rate: float = 0.01
    public_trust: float = 0.65
    economic_stability: float = 0.75
    healthcare_capacity: float = 0.8
    civil_unrest: float = 0.1

    population: float = 1.0
    cumulative_cost: float = 0.0

    flags: dict = field(default_factory=dict)
    delayed_effects: list = field(default_factory=list)

    history: dict = field(default_factory=lambda: {
        "day": [],
        "population": [],
        "infection": [],
        "economy": [],
        "cost": []
    })

    def clamp(self):
        for attr in [
            "global_infection",
            "mortality_rate",
            "public_trust",
            "economic_stability",
            "healthcare_capacity",
            "civil_unrest",
            "population"
        ]:
            v = getattr(self, attr)
            setattr(self, attr, max(0.0, min(1.0, v)))


# chaos effect engine

def queue_delayed_effect(state, days_ahead, fn):
    state.delayed_effects.append((state.day + days_ahead, fn))


def resolve_delayed_effects(state):
    ready = [e for e in state.delayed_effects if e[0] <= state.day]
    for _, fn in ready:
        fn(state)
    state.delayed_effects = [e for e in state.delayed_effects if e not in ready]


def natural_progression(state):
    deaths = state.global_infection * state.mortality_rate * 0.03
    state.population -= deaths
    state.healthcare_capacity -= state.global_infection * 0.01
    state.economic_stability -= state.civil_unrest * 0.02
    state.cumulative_cost += state.global_infection * 50


def record_history(state):
    state.history["day"].append(state.day)
    state.history["population"].append(state.population)
    state.history["infection"].append(state.global_infection)
    state.history["economy"].append(state.economic_stability)
    state.history["cost"].append(state.cumulative_cost)


# events and choices

class Choice:
    def __init__(self, text, fn):
        self.text = text
        self.apply = fn


class Event:
    def __init__(self, text, choices):
        self.text = text
        self.choices = choices



def day1_event():
    def release(state):
        state.public_trust += 0.05
        state.global_infection += 0.01

    def delay(state):
        state.public_trust += 0.02
        queue_delayed_effect(
            state, 5,
            lambda s: setattr(s, "global_infection", s.global_infection * 1.8)
        )

    def suppress(state):
        state.public_trust -= 0.1
        state.flags["censored_media"] = True
        queue_delayed_effect(
            state, 7,
            lambda s: setattr(s, "civil_unrest", s.civil_unrest + 0.25)
        )

    return Event(
        "Initial reports indicate a novel respiratory pathogen.\n"
        "Fatality data is uncertain.\n\n"
        "Authorize public disclosure?",
        [
            Choice("Release preliminary data", release),
            Choice("Delay announcement", delay),
            Choice("Suppress information", suppress),
        ]
    )



def day5_event():
    def vaccine(state):
        state.cumulative_cost += 300
        state.mortality_rate -= 0.01
        queue_delayed_effect(
            state, 10,
            lambda s: setattr(s, "public_trust", s.public_trust - 0.25)
        )

    def patents(state):
        state.cumulative_cost -= 200
        state.flags["sold_patents"] = True
        queue_delayed_effect(
            state, 8,
            lambda s: setattr(s, "mortality_rate", s.mortality_rate + 0.04)
        )

    return Event(
        "Pharmaceutical firms offer rapid vaccine deployment\n"
        "in exchange for exclusive global patents.",
        [
            Choice("Fund emergency vaccine trials", vaccine),
            Choice("Sell patents to stabilize economy", patents),
        ]
    )


def day12_event():
    def militarize(state):
        state.civil_unrest -= 0.1
        state.flags["weaponized_quarantine"] = True
        queue_delayed_effect(
            state, 6,
            lambda s: setattr(s, "public_trust", s.public_trust - 0.3)
        )

    def negotiate(state):
        state.public_trust += 0.05
        state.economic_stability -= 0.1
        queue_delayed_effect(
            state, 4,
            lambda s: setattr(s, "civil_unrest", s.civil_unrest + 0.2)
        )

    return Event(
        "Mass protests block hospital access.\n"
        "Security forces demand authorization.",
        [
            Choice("Deploy military quarantine", militarize),
            Choice("Negotiate with protest leaders", negotiate),
        ]
    )



def day20_event():
    def sacrifice(state):
        state.global_infection -= 0.2
        state.population -= 0.15
        state.public_trust -= 0.4
        state.flags["sacrificed_region"] = True

    def refuse(state):
        state.global_infection += 0.15
        queue_delayed_effect(
            state, 5,
            lambda s: setattr(s, "healthcare_capacity", s.healthcare_capacity - 0.3)
        )

    return Event(
        "Sealing one major region could halt transmission.\n"
        "Evacuation is impossible.",
        [
            Choice("Authorize total regional lockdown", sacrifice),
            Choice("Refuse and preserve unity", refuse),
        ]
    )


def get_event_for_day(day):
    if day == 1:
        return day1_event()
    if day == 5:
        return day5_event()
    if day == 12:
        return day12_event()
    if day == 20:
        return day20_event()
    return None


# endings (time gated)

def check_endings(state):
    if state.day < 25:
        return None

    if state.global_infection > 0.95 and state.healthcare_capacity < 0.1:
        return "HUMAN EXTINCTION"

    if state.global_infection < 0.05 and state.economic_stability < 0.1:
        return "COUNTRY SACRIFICED"

    if state.global_infection < 0.05 and state.mortality_rate < 0.2:
        return "CONTROLLED ERADICATION"

    if state.global_infection < 0.3 and state.public_trust < 0.2:
        return "GENERATIONAL TRAUMA"

    return None



# game loop


state = WorldState()


def run_day(choice_index=None):
    output = []

    output.append(f"\n{'─'*50}")
    output.append(f"DAY {state.day}")

    natural_progression(state)

    event = get_event_for_day(state.day)
    if event:
        output.append(event.text)
        output.append("")
        for i, c in enumerate(event.choices, 1):
            output.append(f"{i}) {c.text}")

        if choice_index is not None:
            event.choices[choice_index].apply(state)
    else:
        output.append("No major decisions today.")

    resolve_delayed_effects(state)
    state.clamp()
    record_history(state)

    ending = check_endings(state)

    state.day += 1

    if ending:
        output.append(f"\n{'='*50}")
        output.append(f"ENDING REACHED: {ending}")

    return "\n".join(output)


# js entry pts.

def start_game():
    return run_day()


def make_choice(choice_index):
    return run_day(choice_index)


def get_graph_data():
    return state.history