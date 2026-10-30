# Tasks: Sound Effects

- **Functional Spec:** [functional-spec.md](./functional-spec.md)
- **Tech Spec:** [technical-considerations.md](./technical-considerations.md)

## Open Questions

Every task below carries `**[Agent: general-purpose]**` because the project ships without specialists and no plugin-provided specialists match this stack. Two gaps worth filling before (or during) implementation:

- **Frontend / vanilla TypeScript canvas-game specialist** — would own the implementation tasks (Slices 1–3). The project uses strict TS, Canvas 2D, Vite, Vitest and Playwright, with hard rules about DOM allow-lists and determinism. A specialist with those skills attached would catch architecture-rule violations the generalist might miss. Install via `/awos:hire` or add to `.claude/agents/` by hand.
- **QA / testing agent** — would own the Feature Testing & Regression slice (acceptance tests driven from the functional spec against `createGame`, plus the Playwright wiring additions). A generic `testing-expert`-style agent is enough.

Decide in Step 5 of this run how to carry the gap: accept the generalist, record it and run `/awos:hire` later, or drop the regression slice. The per-slice Verify tasks stay regardless.

---

## Slice plan

The slices below are vertical: after each one, `npm run dev` boots the app, `npm test` passes, and a visible or testable piece of the feature is live.

- [ ] **Slice 1: Jump plays a procedurally-synthesized sound (default on, no mute yet)**

  > After this slice, pressing Space jumps the dinosaur and plays a short tone. Sound is permanently on in this slice — the mute toggle lands in Slice 2.

  - [x] Add `AudioPlayer` interface to `src/types.ts` (`playJump(): void`, `dispose(): void`). **[Agent: general-purpose]**
  - [x] Add an `AUDIO` grouping object to `src/tuning.ts` (`jumpFrequency: 440`, `jumpDurationMs: 80`, `jumpGain: 0.15`, `as const`), with a JSDoc line referencing spec 002. **[Agent: general-purpose]**
  - [x] Create `src/audio-dom.ts` exporting `createAudioPlayer(window: Window): AudioPlayer`. Lazily construct one `AudioContext`; on each `playJump()` call `ctx.resume()` and schedule an `OscillatorNode` + `GainNode` with an attack/decay envelope using the `AUDIO` constants. Wrap every Web Audio call in `try/catch`; on any failure become a silent no-op for the session. Return a no-op player if `window.AudioContext` is undefined. **[Agent: general-purpose]**
  - [ ] Update `eslint.config.*` (flat config) to add `src/audio-dom.ts` to the DOM allow-list for `no-restricted-globals` (`window`), and permit the `AudioContext`/`webkitAudioContext` globals it needs. Confirm `npm run lint` still passes. **[Agent: general-purpose]**
  - [ ] Create `src/features/jump-sfx.ts` exporting `installJumpSfx({ game, renderer, audio }): { dispose(): void }`. Subscribe to `jump` → `audio.playJump()`. Subscribe to `start` and `restart` (no-op `reset()` placeholder; wired for symmetry with `installPuddle`). Return a disposer that unsubscribes both and no-ops the audio. No DOM access. **[Agent: general-purpose]**
  - [ ] Wire into `src/main.ts`: construct `audio = createAudioPlayer(window)` and `installJumpSfx({ game, renderer, audio })` directly after the existing `installPuddle(...)` line. **[Agent: general-purpose]**
  - [ ] Add `tests/features/jump-sfx.test.ts`: a `createRecordingAudioPlayer()` fake records `playJump` calls; drive `createGame` with stubbed `randomSeed` + in-memory store + `collisions: false`, dispatch `'primary'` on the ground, tick once, and assert exactly one recorded call per `jump` event. Confirm the test fails before the feature wires in (RED). **[Agent: general-purpose]**
  - [ ] Add `tests/audio-dom.test.ts` covering the no-op fallback path: construct `createAudioPlayer({} as Window)` (no `AudioContext`), call `playJump()` and `dispose()`, assert no throw. **[Agent: general-purpose]**
  - [ ] **Verify:** Record the dev-server PID before anything else. Start `npm run dev`, open `http://localhost:5173/`, press Space to start, press Space to jump; confirm you hear a short tone exactly at take-off and nothing on landing. Then run `npm test` and `npm run lint`; both must pass. Stop the dev server by killing the recorded PID (do not pipe `vite`'s own stop into another command). Delete any screenshots or scratch files produced during the check. **[Agent: general-purpose]**

- [ ] **Slice 2: M-key toggles mute within a session, with a visible "SOUND: OFF" HUD label**

  > After this slice, pressing M mid-run (or on the start / game-over screen) silences the next jump and shows a "SOUND: OFF" label in the top-left; pressing M again restores sound. Preference does not persist across reloads yet — that is Slice 3.

  - [ ] Add `attachMuteKey(target: Window, onToggle: () => void): () => void` to `src/input-dom.ts`. Listen for `keydown` with `event.code === 'KeyM'` and `event.repeat === false`; call `event.preventDefault()` and `onToggle()`. Return a disposer that removes the listener. **[Agent: general-purpose]**
  - [ ] Widen `installJumpSfx` return type to `{ dispose(): void; toggleMute(): void }`. Inside the feature, add a `let muted = false` closure variable; the `jump` handler returns early when `muted` is true; `toggleMute()` flips the boolean. **[Agent: general-purpose]**
  - [ ] Add a `MUTE_HUD` object to `src/tuning.ts` (`{ left: 10, top: 20 }` as const). **[Agent: general-purpose]**
  - [ ] Register a `drawMuteLabel` layer draw inside `installJumpSfx` via `renderer.addLayer('hud', ...)`. When `muted` is true, paint `"SOUND: OFF"` with `HUD_FONT`, `PALETTE.fg`, `textAlign = 'left'`, `textBaseline = 'middle'` at `(MUTE_HUD.left, MUTE_HUD.top)`. When `muted` is false, return early. **[Agent: general-purpose]**
  - [ ] Wire in `main.ts`: capture the `sfx` handle; call `const detachMute = attachMuteKey(window, sfx.toggleMute)`. **[Agent: general-purpose]**
  - [ ] Extend `tests/features/jump-sfx.test.ts`: toggle path (start un-muted → `toggleMute()` → jump → zero calls → `toggleMute()` → jump → one call), and HUD-paint path using a recording `DrawContext` (muted = true paints `"SOUND: OFF"` once; muted = false paints zero times). **[Agent: general-purpose]**
  - [ ] **Verify:** Record the dev-server PID. Start `npm run dev`, open the game, press Space to start, press Space to jump (hear tone), press M (silence; "SOUND: OFF" visible in the top-left in the same pixel style as the score), press Space to jump again (no tone), press M (label disappears, next jump plays). Repeat with M pressed on the start screen and on the game-over screen — label state and sound state persist across phase changes. Run `npm test` and `npm run lint`. Stop the dev server by killing the recorded PID. Delete scratch artifacts. **[Agent: general-purpose]**

- [ ] **Slice 3: Mute preference persists across visits via `dino.mute` in localStorage**

  > After this slice, the mute state survives a page reload: close the tab muted, reopen, start muted. Add the `window.__dino.muted()` test hook so Playwright can observe the state without poking storage directly.

  - [ ] Add `MuteStore` interface to `src/types.ts` (`load(): boolean`, `save(muted: boolean): void`). **[Agent: general-purpose]**
  - [ ] Add `createMemoryMuteStore(initial?: boolean): MuteStore` and `createStorageMuteStore(storage: KeyValueStorage, key: string): MuteStore` to `src/store.ts`. Storage version: `load` returns `true` only when the raw string is `'1'`, else `false` (default on); `save` writes `'1'` or `'0'`; both wrapped in `try/catch` returning the default / silently dropping writes. **[Agent: general-purpose]**
  - [ ] Add `createLocalStorageMuteStore()` and `MUTE_STORAGE_KEY = 'dino.mute'` to `src/main.ts`, mirroring the existing `createLocalStorageStore()` probe-fallback pattern. **[Agent: general-purpose]**
  - [ ] Thread `muteStore` through `installJumpSfx` deps. On install, `muted = muteStore.load()`; `toggleMute()` flips the boolean then calls `muteStore.save(muted)`. **[Agent: general-purpose]**
  - [ ] Extend `window.__dino` in `main.ts` to include `muted: () => boolean`, declared in `src/global.d.ts`. Bump `__dino.version` (growth, not rename). **[Agent: general-purpose]**
  - [ ] Add `tests/store.mute.test.ts`: round-trip `'0'`/`'1'`; unknown values read as `false`; `getItem` throwing is caught and returns `false`; `setItem` throwing is caught and does not throw out. **[Agent: general-purpose]**
  - [ ] Extend `tests/features/jump-sfx.test.ts`: construct the feature with `createMemoryMuteStore(true)` → first jump produces zero recorder calls (persisted muted preference loaded on install). After `toggleMute()`, assert `muteStore.load()` returns `false`. **[Agent: general-purpose]**
  - [ ] Extend `e2e/smoke.spec.ts` with mute-persistence wiring assertions only: assert `__dino.muted() === false` on load; press `KeyM`; assert `__dino.muted() === true` and `localStorage.getItem('dino.mute') === '1'`; `page.reload()`; assert `__dino.muted() === true` after reload; press `KeyM`; assert `localStorage.getItem('dino.mute') === '0'`. No audio-playback assertion. **[Agent: general-purpose]**
  - [ ] Amend `context/product/architecture.md` section 3 Browser surface list to add `dino.mute` alongside `dino.hi`, and section 2.1's `store.ts` row to mention the mute stores. One-line additions, no removals. **[Agent: general-purpose]**
  - [ ] **Verify:** Record the dev-server PID. Start `npm run dev`. Toggle mute, close the tab, reopen `http://localhost:5173/`; the "SOUND: OFF" label is visible before the first jump and the first jump plays no sound. In DevTools, confirm `localStorage.getItem('dino.mute') === '1'`. Toggle off, reload; sound returns and `localStorage.getItem('dino.mute') === '0'`. Clear `dino.mute` from DevTools, reload; game loads with sound on (default). Run `npm test`, `npm run lint`, and `npm run e2e`. Stop the dev server by killing the recorded PID. Delete scratch artifacts. **[Agent: general-purpose]**

- [ ] **Slice 4: Feature Testing & Regression**

  > Verifies the whole feature end-to-end against functional-spec.md, run after all implementation slices are complete.
  - [ ] Read functional-spec.md acceptance criteria in full. Generate acceptance-level tests that verify the entire feature as a whole — not individual slices. Cover applicable layers (unit for pure logic via `createGame` with stubbed deps, integration for feature + renderer + store wiring, e2e for mute-persistence wiring in Playwright). Write tests with RED validation (must fail before implementation is confirmed done). Annotate each test with `@spec: 002-sound-effects` and `@regression` if suitable for long-term regression. **[Agent: general-purpose]**
  - [ ] Run all generated tests. All must pass. Fix any failures before proceeding. **[Agent: general-purpose]**
