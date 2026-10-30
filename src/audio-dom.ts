// Web Audio adapter for the jump sound-effect cue (spec 002-sound-effects).
// One of the DOM allow-list files alongside `main.ts`, `render.ts` and
// `input-dom.ts`; pure game code consumes the `AudioPlayer` interface instead.

import { AUDIO } from './tuning.js';
import type { AudioPlayer } from './types.js';

/** AudioContext constructor type; same shape as the vendor-prefixed fallback. */
type AudioCtxCtor = typeof AudioContext;

declare global {
  interface Window {
    // The DOM lib declares `AudioContext` as a bare global and omits it from
    // `Window`; add it back (optional) so the adapter can read it from a
    // supplied window and tests can hand in a stub without it.
    readonly AudioContext?: AudioCtxCtor;
    // Vendor-prefixed Safari fallback; absent in modern browsers.
    readonly webkitAudioContext?: AudioCtxCtor;
  }
}

/**
 * Build an `AudioPlayer` bound to the given window. Returns a silent no-op
 * player when the browser has no `AudioContext` or if any Web Audio call
 * throws, in which case the player stays silent for the rest of the session.
 */
export function createAudioPlayer(target: Window): AudioPlayer {
  const Candidate = target.AudioContext ?? target.webkitAudioContext;
  if (!Candidate) return noopPlayer();
  const Ctor: AudioCtxCtor = Candidate;

  let ctx: AudioContext | null = null;
  let broken = false;

  function playJump(): void {
    if (broken) return;
    try {
      ctx ??= new Ctor();
      void ctx.resume();
      const t0 = ctx.currentTime;
      const t1 = t0 + AUDIO.jumpDurationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(AUDIO.jumpFrequency, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(AUDIO.jumpGain, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t1);
    } catch {
      broken = true;
    }
  }

  function dispose(): void {
    if (ctx) {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
      ctx = null;
    }
  }

  return { playJump, dispose };
}

function noopPlayer(): AudioPlayer {
  return { playJump: () => undefined, dispose: () => undefined };
}
