import { Icon } from './Icon';
import type { InstallHint as Hint } from '../hooks';

export function InstallHint({ hint }: { hint: NonNullable<Hint> }) {
  return (
    <aside className="install" role="status">
      <div className="install-icon"><img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" width="44" height="44" /></div>
      <div className="install-copy">
        <b>Keep Noctiluca on your Home Screen</b>
        {hint.kind === 'ios'
          ? <span>Tap <Icon name="share" size={14} label="Share" /> then <em><Icon name="square-plus" size={14} /> Add to Home Screen</em></span>
          : <span>Install it for full-screen practice, even offline.</span>}
      </div>
      {hint.kind === 'prompt' && hint.install && <button className="install-go" onClick={hint.install} aria-label="Install app"><Icon name="chevron" size={18} /></button>}
      <button className="install-x" onClick={hint.dismiss} aria-label="Dismiss"><Icon name="x" size={16} /></button>
    </aside>
  );
}
