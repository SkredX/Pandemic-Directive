# Pandemic Directive : Zero Hour

Pandemic Directive : Zero Hour is a browser based, choice driven simulation game that explores chaos theory and the butterfly effect through the lens of a global viral outbreak.

Small decisions made under uncertainty can cascade into irreversible global consequences. The game focuses on delayed effects, moral tradeoffs, and systemic collapse rather than binary good or bad choices.

The project is fully client side and is hosted for free using GitHub Pages.


**Live Deployment:** https://skredx.github.io/Pandemic-Directive/


The game features a dark, terminal-style interface with audio immersion and a high-difficulty mathematical model that simulates logistic viral growth and societal decay.

## Features

* **Simulation Engine:** A robust Javascript-based logic engine tracks infection spread using logistic growth models, ensuring statistics behave realistically rather than growing infinitely.
* **Branching Narrative:** 25 days of unique scenarios involving border control, economic bailouts, ethical triage, and martial law.
* **Interruption System:** Random events (e.g., Viral Mutations, Civil Wars) can occur between days, pausing the timeline and forcing immediate, high-stakes decisions.
* **Visual Feedback:** The interface reacts to the game state. If the population drops below 70%, the terminal enters "Critical Mode," shifting the color scheme to red.
* **Audio Immersion:** Includes a looped background drone track and typewriter sound effects synchronized with the text display.
* **Google Analytics:** Integrated tracking for game start and game over events.

## How to Play

1.  **Initialize:** Click the "INITIALIZE PROTOCOLS" button on the loading screen to start the simulation and audio.
2.  **Analyze:** Read the Daily Status Report and the current scenario text.
3.  **Decide:** Input the number corresponding to your choice (e.g., 1 or 2) into the command line.
4.  **Execute:** Press Enter or click the EXECUTE button.
5.  **Survive:** Attempt to reach Day 25. The game ends early if:
    * Population falls below 15% (Extinction).
    * Economy falls below 20% (Collapse).
    * Trust falls below 20% (Revolution).
    * Healthcare reaches 100% load while Infection is over 50% (System Failure).

## Installation

To run this project locally:

1.  Download or clone the repository.
2.  Ensure the following files are in the same directory:
    * index.html
    * styles.css
    * game_core.js
    * bgm.mp3
    * typewriter.mp3
3.  Open index.html in any modern web browser (Chrome, Firefox, Edge).

## Core Concept

You act as a crisis decision maker during the early days of a novel pandemic.  
You do not control outcomes directly.  
You influence a hidden world state that evolves over time.

Key ideas:
- Butterfly effect and nonlinear consequences
- Delayed causality
- Moral compromise under pressure
- Incomplete information
- Irreversibility of decisions

The same choice can lead to different outcomes depending on when and how it is made.

---

## Possible Endings

The game has multiple threshold based endings. None of them are reachable immediately.

Endings are determined by accumulated world state, not by scripted branches.

---

## Technology Stack

- Vanilla JavaScript for game logic
- HTML for structure
- CSS for terminal style presentation
- GitHub Pages for hosting

There is no backend, no server, and no external dependencies.

## Design Philosophy

- Choices modify systems, not outcomes
- Consequences may appear long after the choice is made
- Silence is used as feedback
- Numbers are hidden to emphasize uncertainty
- The player is not a hero

This project intentionally avoids gamification mechanics such as scores, rewards, or optimal paths.

---

## Educational and Research Value

This project can be used to demonstrate:
- Chaos theory and nonlinear systems
- Ethical decision making under uncertainty
- Public policy tradeoffs during crises
- Systems thinking in complex environments

It is suitable as:
- A portfolio project
- A teaching aid
- An interactive research demonstration

---

## License

This project is open source. You are free to modify and distribute it for educational and non commercial purposes.
