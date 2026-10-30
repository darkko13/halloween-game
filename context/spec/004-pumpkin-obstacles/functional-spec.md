# Functional Specification: Pumpkin Obstacles

- **Topic:** Replace the cactus obstacles with carved jack-o'-lantern pumpkins so the game reads as a Halloween-themed runner, with no change to gameplay difficulty, timing, or any other visual element.
- **Status:** Draft
- **Author:** Darko

---

## 1. Overview and Rationale (The "Why")

Today the dinosaur jumps over cacti in a monochrome desert scene. The repository is being used as a Halloween workshop and the game needs to feel like a Halloween game at a glance — but without changing how it plays. A direct swap of the obstacle sprite from cactus to carved jack-o'-lantern turns a first impression ("another dinosaur clone") into a themed one ("oh, pumpkins!") in the first second, and keeps every learned timing intact so a player who was good at the cactus game is still good at the pumpkin game.

The scope is deliberately narrow: only the two obstacle shapes change, and their footprint and the hitbox a jump has to clear are identical to what they are today. The player's muscle memory is preserved; the first-visit experience is more memorable. Score comparisons from before and after this change remain directly comparable, which matters because the high score persists in the browser.

Success looks like: a returning player's reaction is "oh, pumpkins!" within the first few seconds, their jump timing is unchanged, and their stored high score keeps meaning what it did before.

---

## 2. Functional Requirements (The "What")

### 2.1 Small cactus becomes a small pumpkin

- Every obstacle that previously appeared as the small cactus now appears as a single small carved jack-o'-lantern pumpkin.
  - **Acceptance Criteria:**
    - [ ] Given the game is running, when a small obstacle appears from the right edge, then the player sees a single orange pumpkin with a dark green stem, two triangular eyes, and a toothy carved mouth — unmistakably a jack-o'-lantern — in the same spot where a small cactus used to appear.
    - [ ] Given the game is running, when the player compares the small pumpkin's size and placement to screenshots of the previous small cactus, then the pumpkin occupies the same footprint on the ground — same width, same height, same ground alignment.
    - [ ] Given a small pumpkin is approaching, when the dinosaur jumps and clears it at exactly the same tick a well-timed cactus jump would have cleared the equivalent cactus, then the pumpkin is cleared with the same margin — no earlier, no later.

### 2.2 Large cactus becomes a pumpkin stack

- Every obstacle that previously appeared as the large cactus now appears as a short vertical stack of carved pumpkins occupying the same footprint and reaching the same height.
  - **Acceptance Criteria:**
    - [ ] Given the game is running, when a large obstacle appears, then the player sees two pumpkins stacked vertically (the lower one slightly larger if needed), each with the same jack-o'-lantern face as the small pumpkin, in the same spot where a large cactus used to appear.
    - [ ] Given the pumpkin stack is approaching, when the player compares its outline to the previous large cactus, then the stack occupies the same width and reaches the same height as the large cactus did (which is clearly taller than it is wide), with the bottom pumpkin resting on the ground and the second pumpkin sitting cleanly on top of it.
    - [ ] Given a pumpkin stack is approaching, when the dinosaur jumps and clears it at exactly the same tick a well-timed large-cactus jump would have cleared the equivalent cactus, then the stack is cleared with the same margin — no earlier, no later.

### 2.3 Collision timing is unchanged

- The exact tick a jump must happen to clear each obstacle is the same as it was with cacti.
  - **Acceptance Criteria:**
    - [ ] Given the game is running at any speed, when the dinosaur runs into a pumpkin (small or stacked), then the game ends on the same tick it would have ended on with the previous cactus of the same size — not earlier, not later.
    - [ ] Given the dinosaur has jumped and is airborne above a pumpkin, when the pumpkin passes beneath, then it is cleared on the same tick the equivalent cactus would have been cleared — the pumpkin's shape never makes the obstacle feel harder or easier than the cactus did.

### 2.4 The reskin is permanent and unconditional

- The pumpkin appearance is the only appearance the obstacles have — there is no toggle, no theme switch, no date check.
  - **Acceptance Criteria:**
    - [ ] Given the player opens the game on any day of the year, when the first obstacle appears, then it is a pumpkin, not a cactus.
    - [ ] Given the player tries any URL parameter or keyboard combination, when they look at the obstacles, then the obstacles stay as pumpkins — no hidden cactus mode is reachable.

### 2.5 Palette extension is confined to the pumpkin sprite

- A pumpkin-orange and a dark-stem colour are added to the game's palette, but every other scene element keeps its current colour.
  - **Acceptance Criteria:**
    - [ ] Given the game is running, when the player compares the ground, dinosaur, sky background, score text, hint text, and the "Game over" screen to screenshots of the previous version, then every one of those elements is drawn in exactly the same colour as before.
    - [ ] Given the game is running, when the player looks at the pumpkin, then its orange body and dark stem are the only colours in the scene that were not already present before this change.

### 2.6 Everything else is unchanged

- Only the two cactus sprites are replaced. No gameplay rule, no speed curve, no scoring rate, no spawn pattern, no HUD text changes.
  - **Acceptance Criteria:**
    - [ ] Given the player plays a full run, when they count the obstacles that appear per second, when they watch the speed increase, when they watch the score tick up, and when they see the game-over screen with the "Press space to restart" hint, then everything behaves exactly as it does today — only the obstacle sprite is different.
    - [ ] Given the player had a stored high score before this change was deployed, when they open the game after the change, then their stored high score is unchanged and the score they achieve in a new run can be directly compared to it.
    - [ ] Given the dinosaur is running, jumping, or in the "hit" pose on the game-over screen, when the player looks at it, then its appearance is unchanged — no witch hat, no ghost trail, no Halloween accessory.

### 2.7 Boundary and error behavior

- The reskin must not change what the game does when things go wrong.
  - **Acceptance Criteria:**
    - [ ] Given the game runs in a smaller window (the game shrinks to fit), when a pumpkin appears, then it scales with the rest of the scene and nothing is clipped, stretched, or misaligned relative to the ground.
    - [ ] Given the player opens the game with a fixed seed in the URL, when they play two runs on the same seed, then the sequence of pumpkins (which size appears when) is identical across both runs — determinism is preserved.

---

## 3. Scope and Boundaries

### In-Scope

- Replacing the small cactus sprite with a single small jack-o'-lantern pumpkin (orange body, dark stem, carved triangular eyes and toothy mouth).
- Replacing the large cactus sprite with a short vertical pumpkin stack occupying the same footprint and height.
- Keeping the hitbox size and position identical to the previous cactus hitboxes so jump timing is unchanged.
- Adding two new colours (pumpkin-orange and dark stem) to the game's palette, used only on the pumpkin sprite.
- Preserving every existing gameplay rule and HUD element.

### Out-of-Scope

- Any change to the dinosaur sprite (no witch hat, no ghost trail, no Halloween accessory).
- Any change to the ground, sky, score text, hint text, or game-over screen.
- Any change to speed, spawn timing, scoring, collision rules, or run determinism beyond the obstacle sprite swap.
- A toggle, URL theme flag, or date check that would ever show cacti instead of pumpkins.
- Animated pumpkins — the carved face does not flicker, glow, or change expression.
- New obstacle shapes (no ghosts, bats, graves, or witches as obstacles — those are not part of this spec).
- Sound effects tied to pumpkins (handled by the sound-effects spec 002).
- Mobile or touch-driven differences in appearance.
- Localisation of any text, including "Halloween" branding (none is added to the HUD).

---

## Change Log

- [YYYY-MM-DD] — [source reference] — [what behavior changed and why]
