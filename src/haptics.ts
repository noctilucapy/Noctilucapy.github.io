/**
 * Haptics that work on both platforms.
 *  - Android / Chrome: the Vibration API.
 *  - iOS Safari (17.4+): has NO Vibration API. The only web-reachable Taptic Engine hook is the
 *    native `<input type="checkbox" switch>` control, which ticks whenever it is toggled. We keep one
 *    hidden switch in the DOM and toggle it through its <label> from inside the tap handler.
 * Needs "System Haptics" on in iOS Settings > Sounds & Haptics. Silently no-ops anywhere unsupported.
 */
let enabled = true;
export const setHaptics = (on: boolean) => { enabled = on; };

let label: HTMLLabelElement | null = null;

function ensureSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  if (label && label.isConnected) return label;
  const id = 'haptic-switch';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.id = id;
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  const l = document.createElement('label');
  l.htmlFor = id;
  l.setAttribute('aria-hidden', 'true');
  // Must stay rendered (not display:none) or WebKit skips the haptic. Invisible, inert, off to the side.
  const css = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
  input.style.cssText = css;
  l.style.cssText = css;
  l.appendChild(input);
  document.body.appendChild(l);
  label = l;
  return l;
}

const hasVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function iosTick() {
  try { ensureSwitch()?.click(); } catch { /* unsupported */ }
}

/** A short tick. `ms` doubles as strength: <=10 light, <=20 success (two ticks), above that error (three). */
export const tap = (ms = 6) => {
  if (!enabled) return;
  if (hasVibrate) { try { navigator.vibrate(ms); } catch { /* unsupported */ } return; }
  iosTick();
  if (ms > 10) setTimeout(iosTick, 70);
  if (ms > 20) setTimeout(iosTick, 140);
};
