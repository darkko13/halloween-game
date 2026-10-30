# Functional Specification: Sound Effects

- **Topic:** A jump sound effect with a mute toggle, so the game has an audible layer without becoming noisy.
- **Status:** Draft
- **Author:** Darko

---

## 1. Overview and Rationale (The "Why")

Today the game is completely silent. A jump feels weightless because the player has nothing to confirm the action beyond the dinosaur leaving the ground, and nothing distinguishes a well-timed jump from a mistimed one in the half-second before a collision. A single, clear sound on jump gives the action a tactile feel and makes short play sessions more satisfying, which supports the product goal of a one-minute session that invites a retry.

Because the game is often played in classrooms and quiet rooms, the player must be able to silence the game at any time with a single key, and the game must remember that choice between visits so that someone who muted the game yesterday does not startle their neighbour today.

Success looks like: a first-time player hears a jump sound on their first space press without any setup, and a returning player who muted the game last time opens the page in silence.

---

## 2. Functional Requirements (The "What")

### 2.1 Jump sound

- Every time the dinosaur leaves the ground, the game plays a short jump sound.
  - **Acceptance Criteria:**
    - [ ] Given the game is running and sound is on, when the player presses space (or the up arrow) and the dinosaur leaves the ground, then a short jump sound plays once.
    - [ ] Given the dinosaur is already in the air, when the player presses space again, then no additional jump sound plays — the dinosaur cannot double-jump, so there is no second cue.
    - [ ] Given the player is on the start screen or the game-over screen, when they press space to begin or restart the run, then no jump sound plays on that initial press; the first jump sound plays on the next in-game jump.
    - [ ] Given sound is muted, when the dinosaur jumps, then no sound plays.

### 2.2 Mute toggle

- The player can turn sound on and off at any time with the M key. While sound is off, a small "SOUND: OFF" label appears in the top-left corner of the canvas, in the same pixel style as the score.
  - **Acceptance Criteria:**
    - [ ] Given sound is on, when the player presses M, then sound turns off and a "SOUND: OFF" label appears in the top-left corner of the canvas in the same pixel style as the score.
    - [ ] Given sound is off, when the player presses M, then sound turns on and the "SOUND: OFF" label disappears.
    - [ ] Given the player is on the start screen, the game-over screen, or mid-run, when they press M, then the toggle works the same way in every state.
    - [ ] Given the player is holding space or the up arrow, when they press M at the same time, then both actions take effect — the dinosaur still jumps and the sound state still toggles.

### 2.3 Remembered mute preference

- The game remembers the player's last mute choice between visits, in the same browser, in the same way it remembers the high score.
  - **Acceptance Criteria:**
    - [ ] Given the player muted the game and then closed the tab, when they reopen the page later in the same browser, then the game loads with sound already muted and the muted indicator is visible before the first jump.
    - [ ] Given the player unmuted the game and then closed the tab, when they reopen the page later in the same browser, then the game loads with sound on.
    - [ ] Given the player opens the game for the very first time (no stored preference), when the page loads, then sound is on by default.
    - [ ] Given stored preference data is missing or unreadable, when the page loads, then the game falls back to sound on and continues to work without an error message.

### 2.4 Boundary and error behavior

- The game must stay playable even when the browser refuses to play audio.
  - **Acceptance Criteria:**
    - [ ] Given the browser blocks audio until the player interacts with the page (a common browser rule), when the player presses space to start the first run, then the game begins normally and the first jump may stay silent on some browsers — the game continues and no error is shown.
    - [ ] Given the first jump sound was silently blocked, when the player jumps a second time, then the jump sound plays normally from that jump onward.
    - [ ] Given the player's device has no audio output available, when the game runs, then every other feature (jumping, scoring, game over, restart, high score) continues to behave exactly as it does today.

---

## 3. Scope and Boundaries

### In-Scope

- A single jump sound effect.
- An M-key mute toggle that works in every game state (start screen, mid-run, game over).
- A visible on-screen indicator while sound is muted.
- Remembering the mute preference between visits in the same browser.
- Sound on by default on first visit.
- Graceful behavior when the browser blocks audio or no audio device is available.

### Out-of-Scope

- Sounds for any event other than jump (no score-milestone ping, no collision sound, no new-high-score fanfare, no landing sound).
- Background music.
- Volume control or a volume slider.
- A clickable speaker icon or any mouse-driven control.
- Multiple sound themes or selectable sound packs.
- Localised or spoken audio.
- Mobile or touch-driven audio controls.

---

## Change Log

- [YYYY-MM-DD] — [source reference] — [what behavior changed and why]
