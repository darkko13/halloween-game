# Functional Specification: Night Sky With a Moon and Drifting Clouds

- **Topic:** A background sky with drifting clouds that gradually turns from day to night with a visible moon once the player's score passes 300.
- **Status:** Draft
- **Author:** Darko

---

## 1. Overview and Rationale (The "Why")

Today the game sits on a plain, static background. The dinosaur runs through what feels like an empty frame, and the only thing that visibly changes as the player survives longer is the score ticking up in the corner. The run has no sense of time passing beyond the number itself.

A quietly animated sky — a few clouds drifting slowly across a soft background, and later a moon appearing as night falls — gives the longer runs a visible reward and makes the first thirty seconds easier to look at. The transition at score 300 turns a milestone the player might otherwise overlook into a visible moment: "the sky changed, I'm still alive." That makes a one-minute session more memorable without changing anything about how the game is played.

The gameplay elements — ground, dinosaur, cacti, the score and high-score display — look exactly like they do today. Only the area above the ground changes.

Success looks like: a player who plays twice in a row notices the sky, their first impression is "this feels like a real little game, not a tech demo," and the time-to-first-jump is unchanged.

---

## 2. Functional Requirements (The "What")

### 2.1 Day sky as the starting state of every run

- Every run begins with a light day sky above the ground and a few clouds already visible, drifting slowly from right to left.
  - **Acceptance Criteria:**
    - [ ] Given the player opens the page for the first time, when the start screen appears, then the area above the ground shows a light sky colour and at least two drifting cloud shapes.
    - [ ] Given the game is on the start screen, when the player watches without pressing a key, then the clouds continue to drift from right to left at a slow, steady pace while the dinosaur stands still.
    - [ ] Given the player presses space to start a run, when the dinosaur starts running, then the clouds keep drifting at the same slow pace, independent of the ground scroll speed. They are visibly slower than the ground, so the ground feels close and the clouds feel far away.
    - [ ] Given the player is running at score 0, when they look at the sky, then no moon is visible — only the day sky and drifting clouds.

### 2.2 Deterministic cloud layout per run

- The sequence of clouds a player sees during a run depends only on that run's starting conditions, so a seeded replay shows the same clouds at the same moments.
  - **Acceptance Criteria:**
    - [ ] Given the player opens the game with a fixed seed in the URL (e.g. `?seed=42`), when they watch the first ten seconds of the run twice in a row, then the two sequences of clouds are visually identical in shape, position, and timing.
    - [ ] Given the player restarts a run on an unseeded page, when the new run begins, then the clouds reset to a fresh starting layout. The clouds do not carry over mid-sky from the previous run.

### 2.3 Night falls at score 300 with a gradual fade

- Once the score reaches 300 the sky transitions from day to night over a short visible fade, and the moon appears.
  - **Acceptance Criteria:**
    - [ ] Given the game is running and the score is below 300, when the player watches the sky, then it stays in the day state — light sky, no moon.
    - [ ] Given the game is running, when the score crosses 300, then the sky begins to darken from the day colour toward a night colour and continues doing so smoothly over roughly 2 to 3 seconds without a sudden flash. During the fade the clouds remain in place and keep drifting.
    - [ ] Given the fade has started, when it finishes, then the sky is in its night colour, a moon is visible as a single fixed shape in the upper area of the sky, and the clouds that remain visible are shown in a dimmer tone that matches the night sky.
    - [ ] Given the fade has finished, when the player keeps running, then the night state does not change further for the rest of the run — the moon stays in the same place and the sky colour stays constant.

### 2.4 The moon's appearance

- One moon appears after the night transition and stays in the same place and shape for every run.
  - **Acceptance Criteria:**
    - [ ] Given the game has reached the night state, when the player looks at the sky, then one moon is visible as a pixel-style crescent in the upper-right quadrant of the sky.
    - [ ] Given the night state is active, when the player keeps playing, then the moon does not drift, rotate, blink, or change shape.
    - [ ] Given the game is in the day state (before the transition), when the player looks at the sky, then no moon is visible.

### 2.5 Freeze on game over

- When the player dies, the sky freezes along with the rest of the scene.
  - **Acceptance Criteria:**
    - [ ] Given the dinosaur hits a cactus, when the game-over screen appears, then the clouds and the sky colour stop moving and changing at that exact moment and stay frozen for as long as the game-over screen is shown.
    - [ ] Given the player died mid-fade between day and night, when the game-over screen is shown, then the sky stays at the mid-fade colour and the moon stays at the partial opacity it had at the moment of death — the fade does not continue or snap to either end.

### 2.6 Restart returns to day

- Pressing space on the game-over screen fully resets the sky to its day state along with the rest of the run.
  - **Acceptance Criteria:**
    - [ ] Given the player died at any point in the night state, when they press space to restart, then the new run begins with a day sky, drifting clouds, and no moon.
    - [ ] Given the player restarts, when the new run begins, then the cloud layout follows the deterministic rule in requirement 2.2 — a seeded page replays the same clouds; an unseeded page shows a fresh layout.

### 2.7 Gameplay elements unchanged

- The ground, dinosaur, cacti, score and high-score display look exactly like they do today.
  - **Acceptance Criteria:**
    - [ ] Given the sky is in either day or night, when the player looks at the ground, the dinosaur, or any cactus, then those elements look exactly like they do today — same colours, same shapes, same size, same positions.
    - [ ] Given the sky is in the night state, when the player looks at the score and high-score text in the corner, then the text is painted in its usual colour and remains readable against the darker sky.

### 2.8 Boundary and error behavior

- The sky must not block or slow down the game.
  - **Acceptance Criteria:**
    - [ ] Given the sky, clouds, and moon are all visible, when the player plays a full run, then jumping, obstacles, collisions, scoring, and restart all behave exactly as they do today — no delays, no missed jumps, no stuttering caused by the sky.
    - [ ] Given the player is in a window too narrow to show the game at its full size (the game shrinks to fit), when the sky is visible, then the sky, clouds, and moon shrink along with the rest of the scene and nothing is clipped or stretched.

---

## 3. Scope and Boundaries

### In-Scope

- A light day-sky background with a few (3 to 4) drifting clouds, visible from the moment the page loads.
- Clouds that drift from right to left at a slow, parallax pace, independent of the ground scroll.
- A smooth 2-to-3-second fade from day to night when the score crosses 300.
- A single pixel-style crescent moon in the upper-right quadrant of the sky, visible only in the night state, in the same position and shape every run.
- A dimmer rendering of clouds in the night state so they stay visible against the darker sky.
- Freeze-on-death and reset-on-restart behaviour that matches the rest of the game.
- Deterministic cloud layout from the run's seed.
- No change to the ground, dinosaur, cacti, score, high score, or HUD.

### Out-of-Scope

- Day/night cycling back to day — once night falls in a run, it stays night until restart.
- Multiple moon phases, or a moon that moves, rotates, or changes shape.
- Stars, shooting stars, or any sky content besides sky colour, clouds, and the moon.
- Sunrise/sunset colour gradients beyond the single day-to-night fade.
- Parallax layers other than the clouds (no distant hills, no foreground foliage).
- Weather effects (rain, snow, lightning, wind gusts).
- Any change to the gameplay palette (ground, dinosaur, cacti, HUD stay as they are today).
- Any effect on gameplay difficulty, score rate, or obstacle spawning.
- Sound effects accompanying the transition (handled by the sound-effects spec, 002).
- A player toggle to switch between day and night manually.
- Mobile or touch-driven differences in sky behaviour.

---

## Change Log

- [YYYY-MM-DD] — [source reference] — [what behavior changed and why]
