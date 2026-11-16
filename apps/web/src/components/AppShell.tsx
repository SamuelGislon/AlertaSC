import type { ReactNode } from 'react';
import { Circle, LogOut, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.js';

export interface ShellNavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  area: 'public' | 'citizen' | 'operator';
  navigation: ShellNavigationItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
  onLogout?: () => void;
  children: ReactNode;
}

const areaLabels = {
  public: 'Área pública',
  citizen: 'Área do cidadão',
  operator: 'Área do operador',
} as const;

export function AppShell({ area, navigation, activeItem, onNavigate, onLogout, children }: AppShellProps) {
  const renderNavigation = (label: string) => <nav className={label === 'Navegação móvel' ? 'bottom-nav' : 'main-nav'} aria-label={label}>
    {navigation.map((item) => <Button key={item.id} type="button" variant="ghost" className="nav-button"
      aria-current={activeItem === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
      <item.icon className="nav-icon" size={18} strokeWidth={1.9} aria-hidden="true" focusable="false" />
      <span>{item.label}</span>
    </Button>)}
  </nav>;

  return <div className="app-shell">
    <header className="app-header">
      <div className="header-inner">
        <a href="#" className="brand-block" onClick={(event) => { event.preventDefault(); onNavigate(area === 'operator' ? 'overview' : 'public'); }}>
          <span className="brand-mark" aria-hidden="true">CA</span>
          <span><span className="brand-name">Clima em Alerta</span><span className="brand-caption">Presidente Getúlio · SC</span></span>
        </a>
        {renderNavigation('Navegação principal')}
        <div className="header-account">
          <span className="role-chip">{areaLabels[area]}</span>
          <span className="demo-chip"><Circle size={8} fill="currentColor" aria-hidden="true" /> Dados sintéticos</span>
          {onLogout && <Button type="button" variant="outline" className="button button-outline logout-button" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" /> Sair
          </Button>}
        </div>
      </div>
    </header>
    <main className="page" id="main-content" tabIndex={-1}>{children}</main>
    {renderNavigation('Navegação móvel')}
    <footer className="page-footer">Clima em Alerta · ambiente de demonstração · dados fictícios · sem observação oficial</footer>
  </div>;
}
