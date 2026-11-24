let enabled = true;
export const setHaptics = (on: boolean) => { enabled = on; };
/** A short tick. Silently does nothing where the Vibration API is missing (iOS Safari). */
export const tap = (ms = 6) => { if (enabled) { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } } };
