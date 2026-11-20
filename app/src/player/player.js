/** Parse the library's JSONL and expose only passed, safe relative audio paths. */
export function readManifest(jsonl, baseUrl) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:') throw new Error('Audio base URL must use HTTPS');
  return jsonl.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
    let row;
    try { row = JSON.parse(line); } catch { throw new Error(`Invalid audio manifest row ${index + 1}`); }
    if (row.status !== 'passed') return null;
    if (typeof row.file !== 'string' || !/^[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+$/.test(row.file) || row.file.split('/').some(part => part === '..' || !part) || typeof row.ref !== 'string' || !row.ref || typeof row.seconds !== 'number' || !Number.isFinite(row.seconds) || row.seconds <= 0) throw new Error(`Invalid audio manifest row ${index + 1}`);
    return { ...row, url: new URL(row.file, base.href.endsWith('/') ? base.href : base.href + '/').href };
  }).filter(Boolean);
}

/** Temporary Phase 2A seam: replace with its canUse('offline', user). */
export function canUse(feature, user) { return feature === 'offline' && user?.paid === true; }

/** Playback is owned by the host's native audio adapter, independent of screen lifecycle. */
export function createPlayer({ audio, downloads, clock = globalThis, now = Date.now }) {
  let track = null, timer = null, deadline = null, dimmed = false, playing = false, error = null;
  const listeners = new Set();
  const state = () => ({ track, deadline, dimmed, playing, error });
  const notify = () => { for (const listener of listeners) listener(state()); };
  const clearTimer = () => { if (timer !== null) clock.clearTimeout(timer); timer = null; deadline = null; };
  const expire = () => { clearTimer(); audio.pause(); playing = false; notify(); };
  return {
    state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async play(item, user) {
      error = null;
      try {
        const local = canUse('offline', user) ? await downloads.find(item) : null;
        await audio.load(local || item.url);
        track = item; await audio.play(); playing = true; notify();
      } catch (cause) { playing = false; error = 'Unable to play this audio.'; notify(); throw cause; }
    },
    async resume() { if (!track) return; if (deadline !== null && now() >= deadline) { expire(); return; } await audio.play(); playing = true; notify(); },
    pause() { audio.pause(); playing = false; notify(); },
    setSleepTimer(minutes) {
      if (minutes !== null && ![15, 30, 45, 60].includes(minutes)) throw new Error('Invalid sleep timer');
      clearTimer();
      if (minutes !== null) { deadline = now() + minutes * 60000; timer = clock.setTimeout(expire, minutes * 60000); }
      notify();
    },
    // Call on foreground: elapsed wall time still counts if the OS suspended JS.
    foreground() { if (deadline !== null && now() >= deadline) expire(); },
    setDimmed(value) { dimmed = Boolean(value); notify(); },
    async download(item, user) { if (!canUse('offline', user)) throw new Error('Offline downloads require a paid membership'); return downloads.save(item); },
    dispose() { clearTimer(); listeners.clear(); audio.dispose(); }
  };
}
