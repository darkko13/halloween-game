# Technical Specification: Sound Effects

- **Functional Specification:** [functional-spec.md](./functional-spec.md)
- **Status:** Draft
- **Author(s):** Darko

---

## 1. High-Level Technical Approach

A new cosmetic feature `installJumpSfx` under `src/features/`, following the exact shape of `features/puddle.ts`: it is installed from `main.ts`, keeps its state (muted boolean) in a closure, resets state references on `start` and `restart`, subscribes to the `jump` event to play a sound, and registers a `hud` layer draw callback for the "SOUND: OFF" label. The feature never writes to `GameState` and `game.ts` never learns that audio exists.

Because the architecture forbids DOM access outside the allow-list and forbids binary assets, the feature consumes two pure interfaces — `AudioPlayer` and `MuteStore` — and `main.ts` wires their DOM-backed implementations:

- `src/audio-dom.ts` — a new DOM adapter that owns a Web Audio `AudioContext` and synthesizes the jump sound procedurally (no asset file). Exports `createAudioPlayer(window)` returning an `AudioPlayer`.
- `src/store.ts` — gains `createMemoryMuteStore` and `createStorageMuteStore` factories alongside the existing high-score stores. The existing `createStorageStore` is strictly numeric-and-monotonic, so a parallel pair is cleaner than a shared primitive.
- `src/main.ts` — gains `createLocalStorageMuteStore()`, mirroring the `createLocalStorageStore()` probe-fallback pattern for `dino.hi`, under a new key `dino.mute`.
- The M-key is handled by a tiny DOM listener attached in `main.ts` (via a new `src/input-dom.ts` export `attachMuteKey(window, onToggle)`) that calls `sfx.toggleMute()`. `Intent` is not widened, so the frozen keyboard reducer and the game's dispatch stay untouched.

The feature exposes `installJumpSfx(deps): { dispose(): void; toggleMute(): void }` — a modest widening of the puddle-style return shape, needed so `main.ts` can route the M keystroke to the feature without the feature touching the DOM.

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 File layout

| Path | Responsibility | DOM allowed |
|---|---|---|
| `src/features/jump-sfx.ts` | The feature: subscribes to `jump`, plays via `AudioPlayer` when not muted, resets on `start`/`restart`, draws the "SOUND: OFF" HUD label, owns the muted boolean, loads/saves it through `MuteStore`. Returns `{ dispose, toggleMute }`. | no |
| `src/audio-dom.ts` | DOM adapter: `createAudioPlayer(window): AudioPlayer`. Lazily constructs an `AudioContext` on first `playJump()`, synthesizes a short tone, calls `ctx.resume()` defensively on each call. Exports `dispose()` on the returned player. | yes |
| `src/store.ts` | Add `createMemoryMuteStore(initial?: boolean)` and `createStorageMuteStore(storage: KeyValueStorage, key: string)`. Reuses the existing `KeyValueStorage` interface. | no |
| `src/types.ts` | Add `AudioPlayer` and `MuteStore` interfaces (see 2.3). | no |
| `src/input-dom.ts` | Add `attachMuteKey(target: Window, onToggle: () => void): () => void` — a one-off listener for `code === 'KeyM'` with `event.repeat === false`, calling `event.preventDefault()` and the callback. Returns disposer. | yes |
| `src/main.ts` | Add `MUTE_STORAGE_KEY = 'dino.mute'`, `createLocalStorageMuteStore()`, instantiate the audio adapter, install the feature, attach the M-key listener. | yes |
| `src/tuning.ts` | Add an `AUDIO` grouping object: oscillator frequency, duration in ms, and gain for the jump tone. Add `MUTE_HUD` layout numbers (x, y) for the label — convention mirrors the existing `HUD` object. | no |

### 2.2 Feature shape (`src/features/jump-sfx.ts`)

Mirrors `installPuddle`:

```ts
export interface JumpSfxDeps {
  readonly game: Pick<Game, 'on'>;
  readonly renderer: Pick<Renderer, 'addLayer'>;
  readonly audio: AudioPlayer;
  readonly muteStore: MuteStore;
}
export interface JumpSfxHandle {
  dispose(): void;
  toggleMute(): void;
}
export function installJumpSfx(deps: JumpSfxDeps): JumpSfxHandle;
```

Internal state: `let muted = deps.muteStore.load();`. Subscriptions: `game.on('jump', …)` plays via `audio.playJump()` when `!muted`. `game.on('start', reset)` and `game.on('restart', reset)` — `reset` is a no-op for mute (mute survives a run) but is wired symmetrically with `installPuddle` so the feature's "resets on start/restart" invariant is upheld for any future audio state (e.g. a per-run cooldown). `renderer.addLayer('hud', drawMuteLabel)` paints "SOUND: OFF" when `muted` is true. `toggleMute()` flips the boolean and calls `deps.muteStore.save(muted)`.

### 2.3 Interface contracts

```ts
// types.ts
export interface AudioPlayer {
  playJump(): void;        // non-throwing; swallows audio errors internally
  dispose(): void;
}

export interface MuteStore {
  load(): boolean;         // defaults to false (sound on) when absent or unreadable
  save(muted: boolean): void;
}
```

Both are pure interfaces. The feature depends on them, not on `window.AudioContext` or `localStorage`.

### 2.4 Audio adapter (`src/audio-dom.ts`)

- Procedural synthesis — matches architecture section 7's "no remote assets" and the sprites convention of "no binary assets in the repository."
- One lazy `AudioContext`. On first `playJump()`, construct it; afterwards, call `ctx.resume()` on every `playJump()` so a context suspended by the autoplay policy wakes on the first in-game jump (which is itself inside a keydown-driven call stack and therefore a user gesture).
- The jump tone: an `OscillatorNode` (square wave at ~440 Hz) through a `GainNode` with a short envelope (attack ~5 ms, decay ~70 ms). Exact numbers live in `tuning.ts` as `AUDIO.jumpFrequency`, `AUDIO.jumpDurationMs`, `AUDIO.jumpGain`.
- Every `AudioContext` call is wrapped in `try/catch`. On any failure the player becomes a silent no-op for the rest of the session — the game never shows an error.
- If `window.AudioContext` is undefined (unsupported browser), `createAudioPlayer` returns a no-op `AudioPlayer`.

### 2.5 Mute store (`src/store.ts`)

A parallel pair, modelled on the existing numeric stores:

```ts
export function createMemoryMuteStore(initial: boolean = false): MuteStore;
export function createStorageMuteStore(storage: KeyValueStorage, key: string): MuteStore;
```

`createStorageMuteStore`:
- `load()` reads the raw string; `'1'` → `true`, `'0'` → `false`, anything else → `false` (default on). All reads wrapped in `try/catch` returning `false`.
- `save(muted)` writes `'1'` or `'0'`. Wrapped in `try/catch` — writes may silently fail (quota, disabled storage) without disturbing the feature.

In `main.ts`, `createLocalStorageMuteStore()` mirrors the existing high-score factory:

```ts
function createLocalStorageMuteStore(): MuteStore {
  let storage: Storage;
  try {
    storage = window.localStorage;
    storage.getItem(MUTE_STORAGE_KEY);
  } catch {
    return createMemoryMuteStore();
  }
  return createStorageMuteStore(storage, MUTE_STORAGE_KEY);
}
```

### 2.6 Keyboard

The frozen input reducer (`PRIMARY_CODES = { Space, ArrowUp }`, `Intent = 'primary'`) stays untouched. `src/input-dom.ts` gains an orthogonal export:

```ts
export function attachMuteKey(target: Window, onToggle: () => void): () => void;
```

It calls `event.preventDefault()` and `onToggle()` on `code === 'KeyM'` with `event.repeat === false`. It is independent of `attachKeyboard`, so holding M does not toggle repeatedly, and pressing M during a Space press does not interfere with jumping — per the functional spec's "both actions take effect" criterion.

### 2.7 HUD label

A single new `LayerDraw` registered on `'hud'`, following the `drawScore` pattern in `render.ts`:

- `ctx.font = HUD_FONT`, `textAlign = 'left'`, `textBaseline = 'middle'`.
- `ctx.fillStyle = PALETTE.fg`.
- Position `(MUTE_HUD.left, MUTE_HUD.top)` where `MUTE_HUD.left = 10` (symmetric with `HUD.right = CANVAS.width - 10`) and `MUTE_HUD.top = HUD.top` (= 20).
- Returns early when `muted` is `false`.

### 2.8 `tuning.ts` additions

```
AUDIO = {
  jumpFrequency: 440,  // Hz
  jumpDurationMs: 80,  // total envelope length
  jumpGain: 0.15,      // peak amplitude, 0..1
} as const
MUTE_HUD = { left: 10, top: 20 } as const
```

Values are retunable; the names are the stable contract.

### 2.9 `main.ts` wiring order

Between the existing renderer construction and keyboard binding (line 96 today holds `installPuddle(...)`):

```
const audio = createAudioPlayer(window);
const muteStore = createLocalStorageMuteStore();
const sfx = installJumpSfx({ game, renderer, audio, muteStore });
const detachMute = attachMuteKey(window, sfx.toggleMute);
```

On teardown (if ever needed; currently `main.ts` has no teardown path): `detachMute(); sfx.dispose(); audio.dispose();`.

### 2.10 Growth of the frozen contract

Pure additions (allowed under the Growth rule in architecture section 3):
- New `AudioPlayer` and `MuteStore` interfaces in `types.ts`.
- New `localStorage` key `dino.mute`. The architecture document's Browser-surface list in section 3 names `dino.hi` only — this will need a one-line amendment there, done through `/awos:spec` on the architecture or inline when 002 is approved.
- New `AUDIO` and `MUTE_HUD` exports in `tuning.ts`.
- New `attachMuteKey` export in `input-dom.ts`.

No renames or removals. No change to `Intent`, `GameEvent`, `GameState`, `Game`, or any existing export.

### 2.11 Optional test-hook extension

`window.__dino` currently exposes `{ state, seed, version }` as frozen. We may add `muted: () => boolean` so the Playwright smoke test can assert the mute state without poking `localStorage` directly. Adding a field is allowed by the growth rule; renaming or removing is not. **Assumption:** the hook gains `muted`.

---

## 3. Impact and Risk Analysis

### System Dependencies

- Web Audio API (`AudioContext`) — present in all evergreen desktop browsers listed in architecture section 1. The adapter degrades gracefully to a silent no-op when absent.
- `localStorage` — already a dependency; the mute store rides the same probe-fallback pattern as the high-score store.
- The frozen `jump` event — relied on as the trigger. Its timing (fires on the launching step, before `applyGravity` and `tick`) is already stable and tested; this spec adds a second listener.
- No change to any gameplay module (`game.ts`, `physics.ts`, `obstacles.ts`, `collision.ts`, `score.ts`, `rng.ts`).

### Potential Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Browser autoplay policy** silently blocks the first `playJump()` before a user gesture. | Lazy `AudioContext` + unconditional `ctx.resume()` on every `playJump()`. The first jump is itself keydown-driven, so the user-gesture requirement is satisfied; even if a browser blocks the first play, the next jump succeeds. The functional spec explicitly accepts a silent first jump. |
| **`AudioContext` unsupported** (very old or locked-down browser). | `createAudioPlayer` returns a no-op `AudioPlayer`. The game is otherwise unaffected. |
| **localStorage disabled / full / throwing.** | Both the probe (`getItem` test) and every store call wrapped in `try/catch`; falls back to memory store. Mute still works for the session; preference just does not persist. |
| **Rapid or held M key** causing toggle thrash. | `attachMuteKey` requires `event.repeat === false`, so a held key does not re-toggle. |
| **Audio errors from a corrupted `AudioContext`** (very rare) throwing from inside the `jump` listener. | `playJump()` is non-throwing. The event bus already protects the frame loop by catching listener errors and reporting them via `queueMicrotask`, so even a thrown error would not stall the game — but we go belt-and-braces here because the renderer runs the same frame. |
| **Determinism**: audio changes course of a deterministic replay. | Audio is a leaf feature with no feedback into `GameState` or the game's `Rng`. A seeded page replays the same course regardless of mute state. Confirmed by seed-reproduction unit tests, which continue to pass. |
| **Architecture doc drift**: `dino.mute` is a new persisted key not listed in section 3's Browser surface. | Amend `context/product/architecture.md` section 3 to add `dino.mute` to the Browser-surface list in the same amendment that lands this feature. |

---

## 4. Testing Strategy

### Unit tests (Vitest, Node)

New test file `tests/features/jump-sfx.test.ts`:

- A `createRecordingAudioPlayer()` test double exposes `.calls` (an array of `'jump'`).
- Harness builds `createGame(deps)` with a stubbed `randomSeed`, drives `tick(n)`, dispatches `'primary'` on the ground, and asserts the recorder received exactly one jump call per `jump` event.
- Mute path: construct the feature with a `createMemoryMuteStore(true)`, tick and dispatch a jump, assert zero recorder calls.
- Toggle path: start muted, call `handle.toggleMute()`, trigger a jump, assert one call; call `toggleMute()` again, trigger a jump, assert still one call.
- Persistence path: toggle to muted, construct a second feature instance over the same `MuteStore`, assert `muteStore.load()` returns true and no jump call occurs on jump.
- Default path: fresh `MuteStore` (initial = `false`), jump → one call.
- Idle/dead "no jump sound on the state-changing press": enter `idle`, dispatch `'primary'`, assert zero calls (no `jump` event fires); same for `dead` → `running` restart.

New test file `tests/store.mute.test.ts`:

- `createStorageMuteStore` round-trips `'0'` and `'1'`.
- Unknown/garbage values read as `false`.
- `getItem` throwing is caught, `load()` returns `false`.
- `setItem` throwing is caught, `save()` does not throw.

New test file `tests/render.mute.test.ts`:

- Register `drawMuteLabel` with a recording `DrawContext` (same pattern as existing render tests).
- When `muted = false`, assert zero `fillText` calls for the label text.
- When `muted = true`, assert one `fillText` call at `(MUTE_HUD.left, MUTE_HUD.top)` with the expected string.

### End-to-end (Playwright, Chromium)

Extend `e2e/smoke.spec.ts` with the minimum wiring assertions a unit test cannot prove:

- After bootstrap, no `SOUND: OFF` label is visible (or, if we add `window.__dino.muted`, `__dino.muted()` is `false`).
- Press `KeyM`; assert `__dino.muted()` is `true` **and** `localStorage.getItem('dino.mute') === '1'`.
- `page.reload()`; assert `__dino.muted()` is still `true` on load (persistence through a real page reload — a thing the unit tests cannot prove).
- Press `KeyM` again; assert `localStorage.getItem('dino.mute') === '0'`.

No assertion of actual audio playback — Chromium's audio under Playwright is not a reliable surface and audio behavior is already covered by unit tests on the recording player.

### Type-check & lint

- The new `audio-dom.ts` sits in the DOM allow-list; ESLint `no-restricted-globals` must be updated to permit `window`/`AudioContext` there.
- `src/features/jump-sfx.ts` must stay in the no-DOM group; the lint rule enforces this, and the `AudioPlayer`/`MuteStore` interfaces are what let it do so.

### RED validation

Each new test must fail against the current `main` and pass after the implementation lands, per the testing contract in `CLAUDE.md`.

---

## 5. Open Assumptions

Items marked `**Assumption:**` above, surfaced for easy review:

1. **No binary audio asset** — the jump sound is procedurally synthesized via Web Audio `OscillatorNode` + `GainNode`. Driven by the architecture rule against binary assets. Alternative (requires a doc amendment): ship a small `.wav` in `public/`.
2. **`AUDIO` constants** (`jumpFrequency: 440 Hz`, `jumpDurationMs: 80`, `jumpGain: 0.15`) are a starting point; the names are the contract, the values are retunable.
3. **`window.__dino.muted` test hook** is added (growth of a frozen surface, allowed by the rule but worth calling out).
4. **M-key handling via a new `attachMuteKey` export** in `input-dom.ts`, not by widening `Intent`. Keeps the frozen reducer untouched.
5. **Architecture section 3 amendment** to list `dino.mute` alongside `dino.hi` lands in the same change.
