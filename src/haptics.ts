/**
 * Haptics that work on both platforms.
 *  - Android / Chrome: the Vibration API.
 *  - iOS Safari (17.4+): has NO Vibration API. The only web-reachable Taptic Engine hook is the
 *    native `<input type="checkbox" switch>` control, which ticks whenever it is toggled. We keep one
 *    hidden switch in the DOM and toggle it through its <label> from inside the tap handler.
 * Since iOS 26.5 a programmatic label.click() no longer ticks: the finger must land directly on a real switch.
 * So on iPhone every tappable control gets an invisible switch laid over it (mountIosHaptics); the tap lands on the
 * switch (Taptic tick) and is forwarded to the real control. Same method as the Hadopsalm game.
 * Needs "System Haptics" on in iOS Settings > Sounds & Haptics. Silently no-ops anywhere unsupported.
 */
let enabled = true;
export const setHaptics = (on: boolean) => {
  enabled = on;
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('haptics-off', !on);
};

let label: HTMLLabelElement | null = null;

/** Builds the hidden switch once, early, so WebKit has laid it out long before the first tap.
 *  It must be rendered, on screen and full size: off-screen, 1px or display:none variants are skipped by Safari. */
function ensureSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  if (label && label.isConnected) return label;
  const id = 'haptic-switch';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.id = id;
  input.tabIndex = -1;
  input.style.cssText = 'margin:0;';
  const l = document.createElement('label');
  l.htmlFor = id;
  l.setAttribute('aria-hidden', 'true');
  l.style.cssText = 'position:fixed;left:0;bottom:0;opacity:0.01;pointer-events:none;z-index:-1;margin:0;padding:0;';
  l.appendChild(input);
  document.body.appendChild(l);
  label = l;
  return l;
}

if (typeof document !== 'undefined') {
  const arm = () => { ensureSwitch(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm, { once: true }); else arm();
}

const hasVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

let lastHx = 0; // last time an overlay switch ticked, so the fallback does not double up on older iOS
function iosTick() {
  if (Date.now() - lastHx < 300) return;
  try { ensureSwitch()?.click(); } catch { /* unsupported */ }
}

/** A short tick. `ms` doubles as strength: <=10 light, <=20 success (two ticks), above that error (three). */
let lastTap = 0;
export const tap = (ms = 6) => {
  if (!enabled) return;
  lastTap = Date.now();
  if (hasVibrate) { try { navigator.vibrate(ms); } catch { /* unsupported */ } return; }
  iosTick();
  if (ms > 10) setTimeout(iosTick, 70);
  if (ms > 20) setTimeout(iosTick, 140);
};

/** Every tab, link and button gets a light tick, so screens do not each have to remember to call tap().
 *  Runs after the element's own handler (bubble phase); if that handler already ticked, it stays quiet. */
if (typeof document !== 'undefined' && hasVibrate) {
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('a[href], button, [role="button"], [role="tab"], [role="switch"]');
    if (!el || (el as HTMLButtonElement).disabled || el.closest('.key')) return;
    if (Date.now() - lastTap < 80) return;
    tap();
  });
}

const HOSTS = 'button, a[href]';
const SKIP = '.pad, .cm-editor, [data-nohx]';
export const isIOS = typeof navigator !== 'undefined' && (/iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** iPhone only: overlay an invisible switch on every control so a real tap produces a Taptic tick. */
export function mountIosHaptics() {
  if (typeof document === 'undefined' || !isIOS || hasVibrate) return;
  let queued = false;
  const decorate = () => {
    queued = false;
    document.querySelectorAll<HTMLElement>(HOSTS).forEach((host) => {
      if (host.querySelector(':scope > .hx') || host.closest(SKIP) || (host as HTMLButtonElement).disabled || host.getAttribute('aria-disabled') === 'true') return;
      if (getComputedStyle(host).position === 'static') host.classList.add('hx-host');
      const sw = document.createElement('input');
      sw.type = 'checkbox'; sw.className = 'hx'; sw.tabIndex = -1;
      sw.setAttribute('switch', ''); sw.setAttribute('aria-hidden', 'true');
      sw.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        lastHx = Date.now();
        if (!(host as HTMLButtonElement).disabled) host.click();
      });
      host.append(sw);
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(decorate); } };
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });
  decorate();
}
