import { Icon } from './Icon';

export type TabId = 'home' | 'skills' | 'terminal' | 'record';
const TABS: Array<{ id: TabId; label: string; icon: string; href: string }> = [
  { id: 'home', label: 'Descent', icon: 'home', href: '#/' },
  { id: 'skills', label: 'Skills', icon: 'skills', href: '#/skills' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal', href: '#/terminal' },
  { id: 'record', label: 'Record', icon: 'record', href: '#/record' },
];

export function TabBar({ active, dueCount }: { active: TabId; dueCount: number }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <a key={t.id} className="tab" href={t.href} aria-current={t.id === active ? 'page' : undefined} style={{ textDecoration: 'none' }}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
          {t.id === 'skills' && dueCount > 0 && <i className="dot" aria-label={`${dueCount} reviews due`} />}
        </a>
      ))}
    </nav>
  );
}
