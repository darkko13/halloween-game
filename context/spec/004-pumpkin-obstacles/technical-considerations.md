# Technical Specification: Pumpkin Obstacles

- **Functional Specification:** [functional-spec.md](./functional-spec.md)
- **Status:** Draft
- **Author(s):** Darko

---

## 1. High-Level Technical Approach

The change is a pure data swap plus a small extension of the sprite format. The current sprite format in `src/sprites.ts` is single-glyph monochrome (`#` = pixel, `.` = empty), and `drawSprite` in `src/render.ts` fills every pixel with `PALETTE.fg`. The pumpkin needs three colours (orange body, dark-green stem, dark carved face), so the sprite format gets an optional glyph-to-palette-key mapping. Existing sprites — dino poses, ground — keep working unchanged, because the default mapping is `{ '#': 'fg' }`.

Only three files carry real changes:

- `src/sprites.ts` — extend `Sprite` with a glyph-color map, extend `makeSprite` to accept it, extend `computeRuns` to group runs per glyph. Add `PUMPKIN_SMALL` and `PUMPKIN_STACK` bitmaps with hitboxes **identical to the current cactus hitboxes**. Remove the two cactus bitmaps.
- `src/render.ts` — `drawSprite` iterates the per-glyph run groups, setting `fillStyle` from the sprite's glyph-color map and the palette.
- `src/tuning.ts` — add `PALETTE.pumpkinBody`, `PALETTE.pumpkinStem`, `PALETTE.pumpkinFace`.

Nothing in `game.ts`, `obstacles.ts`, `collision.ts`, `physics.ts`, `score.ts`, or `rng.ts` is touched. `ObstacleKind` stays `'small' | 'large'`. The frozen testing contract is unaffected; gameplay is bit-for-bit identical.

The architecture doc gets a one-line amendment in section 2.1 (the `sprites.ts` row) describing the new multi-glyph sprite format and renaming "two cactus sizes" to "a small pumpkin and a stacked pumpkin."

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 Sprite format extension (`src/sprites.ts`)

Current shape:

```ts
interface Sprite {
  readonly bitmap: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly hitbox: Rect;
  readonly runs: readonly Rect[];       // single-glyph '#' runs
}
```

Extended shape:

```ts
export type PaletteKey = keyof typeof PALETTE;         // from tuning.ts

export interface Sprite {
  readonly bitmap: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly hitbox: Rect;
  /** Horizontal pixel runs grouped by glyph. Ordered map preserves draw order. */
  readonly runs: readonly { readonly glyph: string; readonly rects: readonly Rect[] }[];
  /** Which palette key each glyph in the bitmap paints. '.' is never in here. */
  readonly glyphColors: Readonly<Record<string, PaletteKey>>;
}
```

`makeSprite` gains an optional third argument:

```ts
export function makeSprite(
  bitmap: readonly string[],
  hitbox: Rect,
  glyphColors: Readonly<Record<string, PaletteKey>> = { '#': 'fg' },
): Sprite;
```

- Validation loops accept any glyph key present in `glyphColors`, plus `.`.
- `computeRuns` is extended to a `computeRunsByGlyph(bitmap, glyphs)` helper returning `{ glyph, rects }[]` in the order `glyphs` was given (so draw order is stable).
- The existing dino/ground sprites continue to call `makeSprite(bitmap, hitbox)` with no third argument — zero change at the call site.

### 2.2 Pumpkin bitmap design

Glyphs:

| Glyph | Role | Palette key |
|---|---|---|
| `o` | pumpkin body | `pumpkinBody` |
| `s` | stem | `pumpkinStem` |
| `f` | carved face (eyes, mouth) | `pumpkinFace` |
| `.` | empty | — |

`PUMPKIN_SMALL`: a 17×35 bitmap matching the small-cactus footprint. Round orange body occupying roughly the central 15×22 area, a two-pixel stem on top, and three carved face holes (two triangular eyes and a toothy mouth) rendered in `f`. Illustrative layout — exact pixel art finalised at implementation time:

```
.......ss........
.......ss........
.....ooooooo.....
...ooooooooooo...
..ooofofoofooo...
..oofooofooofo...
..oooooooooooo...
...ooofffffoo....
...ofofffffooo...
...oooooooooo....
...oooooooooo....
.....oooooo......
```

`PUMPKIN_STACK`: a 25×50 bitmap matching the large-cactus footprint. Two pumpkins stacked vertically within the 25×50 box; the lower is slightly larger than the upper so the stack reads clearly. Each pumpkin has the same jack-o'-lantern face. Exact art finalised at implementation time; the only constraints are the 25×50 bounds and the hitbox below.

Both bitmaps live as module-local constants in `sprites.ts`, like the existing `CACTUS_SMALL` and `CACTUS_LARGE`.

### 2.3 Hitboxes — strictly unchanged

```ts
const PUMPKIN_SMALL_HITBOX = { x: 2, y: 0, width: 13, height: 35 } as const;  // was CACTUS_SMALL_HITBOX
const PUMPKIN_STACK_HITBOX = { x: 3, y: 0, width: 19, height: 50 } as const;  // was CACTUS_LARGE_HITBOX
```

Values copied byte-for-byte from the current `CACTUS_SMALL_HITBOX` and `CACTUS_LARGE_HITBOX`. A test asserts the equality literally so a future accidental tweak fails loudly.

### 2.4 `Sprites` registry and `obstacleSprite`

```ts
export const Sprites = Object.freeze({
  dinoStand: makeSprite(DINO_STAND, DINO_HITBOX),
  dinoRun0: makeSprite(DINO_RUN_0, DINO_HITBOX),
  dinoRun1: makeSprite(DINO_RUN_1, DINO_HITBOX),
  dinoHit: makeSprite(DINO_HIT, DINO_HITBOX),
  pumpkinSmall: makeSprite(PUMPKIN_SMALL, PUMPKIN_SMALL_HITBOX, PUMPKIN_GLYPHS),
  pumpkinStack: makeSprite(PUMPKIN_STACK, PUMPKIN_STACK_HITBOX, PUMPKIN_GLYPHS),
  ground: makeSprite(GROUND, { x: 0, y: 0, width: 64, height: 4 }),
});

export function obstacleSprite(kind: ObstacleKind): Sprite {
  switch (kind) {
    case 'small': return Sprites.pumpkinSmall;
    case 'large': return Sprites.pumpkinStack;
    default:      return assertNever(kind);
  }
}
```

The `cactusSmall` and `cactusLarge` entries disappear. Downstream callers (`render.ts`, tests) adjust by name. These names are not in the frozen testing contract; `ObstacleKind` is, and it stays `'small' | 'large'`.

### 2.5 Rendering (`src/render.ts`)

`drawSprite` grows a short inner loop:

```ts
export function drawSprite(ctx, sprite, originX, originY) {
  for (const group of sprite.runs) {
    ctx.fillStyle = PALETTE[sprite.glyphColors[group.glyph]];
    for (const run of group.rects) {
      ctx.fillRect(originX + run.x, originY + run.y, run.width, run.height);
    }
  }
}
```

Three `fillStyle` changes per pumpkin instead of one for a cactus — negligible on a 60 fps canvas with ~3 obstacles on screen. All other call sites (`drawGround`, `drawDino`, `drawObstacles`) are unchanged because they go through `drawSprite`.

### 2.6 Palette (`src/tuning.ts`)

Three additions to `PALETTE` (growth, not rename):

```ts
export const PALETTE = {
  // ...existing entries...
  pumpkinBody: '#F08020',   // warm orange
  pumpkinStem: '#3A5A2A',   // dark green
  pumpkinFace: '#1A0A00',   // near-black
} as const;
```

Values are illustrative; they are easy to retune. The export name `PALETTE` is in the frozen contract and does not change.

### 2.7 Files **not** touched

- `src/game.ts`, `src/obstacles.ts`, `src/collision.ts`, `src/physics.ts`, `src/score.ts`, `src/rng.ts`, `src/types.ts`, `src/input.ts`, `src/input-dom.ts`, `src/main.ts`, `src/store.ts`, `src/features/puddle.ts`, `src/events.ts`, `src/assert.ts`, `src/global.d.ts` — none change.
- `tsconfig*.json`, `vite.config.ts`, ESLint config — none change (no new DOM access, no new globals, no new modules).
- `index.html`, `src/style.css` — no CSS changes required (`image-rendering: pixelated` already covers the new colours).

### 2.8 Architecture doc amendment

One edit in `context/product/architecture.md`:

- Section 2.1, the `sprites.ts` row currently reads: *"Pure data: each sprite as a `readonly string[]` bitmap (`#` = pixel) plus its hitbox. Three dino poses (two run frames, hit), two cactus sizes, ground tile."*
- Amended wording: *"Pure data: each sprite as a `readonly string[]` bitmap with one or more glyph characters mapped to palette keys (`#` = pixel in the default monochrome mapping, `.` = empty), plus its hitbox. Three dino poses (two run frames, hit), a small pumpkin, a stacked pumpkin, ground tile."*

No change to section 3 (frozen contract); no change to any export name listed there.

---

## 3. Impact and Risk Analysis

### System Dependencies

- `src/sprites.ts` — the only data source for obstacle visuals. Change confined here.
- `src/render.ts::drawSprite` — single draw path for every sprite in the game. The multi-glyph loop replaces the single-colour loop; monochrome sprites still render identically because their `runs` array contains one group.
- `src/tuning.ts::PALETTE` — gains three entries. Nothing reads it defensively; adding keys is safe.
- Collision rules read `obstacleSprite(kind).hitbox` through `obstacles.ts`. Because hitboxes are byte-for-byte identical, the collision tick for every seed is unchanged.

### Potential Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Pumpkin hitbox silently drifts from cactus hitbox.** | Dedicated test asserts the two hitboxes equal the previous literal values. Fails loudly on any change. |
| **Multi-glyph refactor regresses the dino/ground monochrome path.** | `makeSprite` keeps the default `{ '#': 'fg' }` mapping. The dino and ground call sites stay unchanged, and a snapshot test on their precomputed runs holds steady. |
| **`drawSprite` fillStyle change on every group costs frames.** | At most three groups per sprite, three obstacles on screen → nine extra `fillStyle` writes per frame. Measurably irrelevant at 60 fps on logical-800×300 pixels. No mitigation beyond keeping the group count small. |
| **Determinism change via accidental sprite-driven side effects.** | Sprite data is pure and read-only; `obstacles.ts` and `game.ts` never read sprite pixels, only the hitbox. The seeded replay test continues to pass unchanged. |
| **Pumpkin shape reads as "two circles" rather than a jack-o'-lantern.** | Visual review during Verify (open the game, confirm the carved face is readable at full size and still identifiable at the smallest shrunk-to-fit window). This is a qualitative acceptance criterion — pixel art is iterated during implementation. |
| **Previously-stored high score becomes ambiguous because the game "looks different."** | Spec explicitly keeps gameplay identical. Document in the architecture-doc amendment: "cosmetic swap, scores comparable." The `dino.hi` key and its format do not change. |
| **An observer confuses the stem glyph `s` for a sprite-level flag or metadata.** | Validator in `makeSprite` lists allowed glyphs in its error message. Code comment at the top of `sprites.ts` describes the glyph convention. |

---

## 4. Testing Strategy

### Unit tests (Vitest, Node)

**New: `tests/sprites.pumpkin.test.ts`:**

- `obstacleSprite('small').hitbox` equals `{ x: 2, y: 0, width: 13, height: 35 }` literally.
- `obstacleSprite('large').hitbox` equals `{ x: 3, y: 0, width: 19, height: 50 }` literally.
- `obstacleSprite('small').width === 17 && .height === 35`; `obstacleSprite('large').width === 25 && .height === 50`.
- `obstacleSprite('small').glyphColors.o === 'pumpkinBody'`, `.s === 'pumpkinStem'`, `.f === 'pumpkinFace'`.
- The pumpkin bitmaps use only `o`, `s`, `f`, `.` — no `#`.

**New: `tests/sprites.format.test.ts` (regression on the format extension):**

- `makeSprite` with no third argument uses `{ '#': 'fg' }` and parses existing dino bitmaps without throwing.
- `makeSprite` with a custom glyph map throws when the bitmap contains a glyph not in the map.
- `computeRunsByGlyph` (or `Sprite.runs`) returns one group per glyph, each with the expected rect count on a known fixture.

**Updated: `tests/render.sprite.test.ts` (or equivalent existing render test):**

- A recording `DrawContext` captures `fillStyle` writes and `fillRect` calls. Painting the small pumpkin produces exactly three `fillStyle` writes (`pumpkinBody`, `pumpkinStem`, `pumpkinFace`) and a positive number of `fillRect` calls under each. Painting a dino produces exactly one `fillStyle` write (`fg`).
- Painting the ground produces exactly one `fillStyle` write (`fg`), unchanged from before.

**Collision regression (existing tests, no change expected):**

- Every existing seed-based acceptance test in `tests/game.*.test.ts` continues to pass without modification. The `die` tick for each seed is identical to the pre-change value. This is the strongest evidence that gameplay is unchanged.

### End-to-end (Playwright, Chromium)

No new assertions. The existing smoke test already covers:

- Canvas size and layout.
- Phase transitions (idle → running → dead) on space and collision.
- Score growth and high-score persistence.

A visual snapshot test is deliberately **not** added — the spec is a visual change, and the existing e2e policy ("no screenshot comparison") stands.

### Type-check & lint

- `tsc --noEmit` must stay green across both tsconfig programs. The `Sprite` interface extension is a widening addition.
- `npm run lint` must stay green. No DOM access is added; no new globals.

### RED validation

Each new test must fail against the current `main` (`obstacleSprite('small')` still returns the cactus) and pass after the pumpkin lands.

---

## 5. Open Assumptions

Items worth surfacing before implementation:

1. **Palette values** `pumpkinBody: '#F08020'`, `pumpkinStem: '#3A5A2A'`, `pumpkinFace: '#1A0A00'` are a starting point. Names are the contract; values retunable during visual review.
2. **The multi-glyph sprite extension stays monochrome-compatible** — default glyph map `{ '#': 'fg' }`. Dino and ground continue to use it unchanged.
3. **`Sprites.cactusSmall` and `Sprites.cactusLarge` are removed** (not aliased). They are not in the frozen testing contract; grep confirms no reference outside `sprites.ts` and `render.ts`. Any test or feature that still references them is updated in the same change.
4. **`LARGE_CACTUS_PROBABILITY` export in `tuning.ts` keeps its current name.** It is already outside the frozen export-names list and renaming it is a wider refactor; this spec deliberately keeps the obstacle-logic naming untouched.
5. **The pumpkin bitmaps are art-directed at implementation time** within the 17×35 and 25×50 bounds. The spec constrains the shape (jack-o'-lantern body, stem, carved eyes and mouth; stack of two for large) but not the exact pixel layout.
6. **Architecture doc amendment** (section 2.1, the `sprites.ts` row) lands in the same change.
