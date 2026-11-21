/** Screen brightness for this app only; adapters.ts backs it with expo-brightness. */
export interface Brightness {
  get(): Promise<number>;
  set(level: number): Promise<void>;
}

export const DIM_AFTER_MS = 15_000;
export const DIM_LEVEL = 0.05;

/**
 * While audio plays with the player in front, the backlight dims after 15 s without a touch.
 * Any touch, leaving the screen, going to the background or unmounting puts the saved level back.
 * `dimmed` also drives a dark overlay, which is all the web preview can do.
 */
export function createDimmer(brightness: Brightness, { afterMs = DIM_AFTER_MS, level = DIM_LEVEL } = {}) {
  let active = false;
  let dimmed = false;
  let saved: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let work: Promise<void> = Promise.resolve();
  const listeners = new Set<(dimmed: boolean) => void>();
  const announce = () => { for (const listener of listeners) listener(dimmed); };
  // Brightness calls run one after another so a restore never lands before the dim it undoes.
  const queue = (step: () => Promise<void>) => { work = work.then(step).catch(() => undefined); return work; };
  const stopTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const dim = () => {
    timer = null;
    if (!active || dimmed) return;
    dimmed = true; announce();
    void queue(async () => { saved = await brightness.get(); await brightness.set(Math.min(level, saved)); });
  };
  const restore = () => {
    stopTimer();
    if (!dimmed) return work;
    dimmed = false; announce();
    return queue(async () => { if (saved !== null) await brightness.set(saved); saved = null; });
  };
  const arm = () => { stopTimer(); if (active) timer = setTimeout(dim, afterMs); };
  return {
    get dimmed() { return dimmed; },
    subscribe(listener: (dimmed: boolean) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** True while audio plays and the player screen is in front. */
    setActive(value: boolean) { active = value; if (active) { if (!dimmed) arm(); } else void restore(); },
    touch() { const done = restore(); arm(); return done; },
    /** Leaving the screen, background, unmount: always back to her level. */
    release() { active = false; return restore(); },
    settled() { return work; },
  };
}
export type Dimmer = ReturnType<typeof createDimmer>;
