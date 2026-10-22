import type { ReactNode } from 'react';

export interface ShellNavigationItem {
  id: string;
  label: string;
  icon: string;
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
    {navigation.map((item) => <button key={item.id} type="button" className="nav-button"
      aria-current={activeItem === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </button>)}
  </nav>;

  return <div className="app-shell">
    <header className="app-header">
      <div className="header-inner">
        <a href="#" className="brand-block" onClick={(event) => { event.preventDefault(); onNavigate(area === 'operator' ? 'overview' : 'public'); }}>
          <span className="brand-mark" aria-hidden="true">AS</span>
          <span><span className="brand-name">AlertaSC</span><span className="brand-caption">Presidente Getúlio · SC</span></span>
        </a>
        {renderNavigation('Navegação principal')}
        <div className="header-account">
          <span className="role-chip">{areaLabels[area]}</span>
          <span className="demo-chip"><span aria-hidden="true">●</span> Dados sintéticos</span>
          {onLogout && <button type="button" className="button button-outline logout-button" onClick={onLogout}>Sair</button>}
        </div>
      </div>
    </header>
    <main className="page" id="main-content" tabIndex={-1}>{children}</main>
    {renderNavigation('Navegação móvel')}
    <footer className="page-footer">AlertaSC · ambiente de demonstração · dados fictícios · sem observação oficial</footer>
  </div>;
}
