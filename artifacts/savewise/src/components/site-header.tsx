import { ArrowDownRight } from 'lucide-react';
import { Link } from 'wouter';

type ActivePage = 'decisions' | 'future-fund' | 'rewards';

const navigation = [
  { id: 'decisions', label: 'Decision studio', href: '/decision-studio', testId: 'link-decisions' },
  { id: 'future-fund', label: 'Future Fund', href: '/future-fund', testId: 'link-future-fund' },
  { id: 'rewards', label: 'Rewards', href: '/rewards', testId: 'link-rewards' },
] as const;

interface SiteHeaderProps {
  activePage: ActivePage;
  statusLabel: string;
}

export default function SiteHeader({ activePage, statusLabel }: SiteHeaderProps) {
  return (
    <header className="topbar site-topbar">
      <div className="topbar-inner site-topbar-inner">
        <Link href="/decision-studio" className="brand-mark site-brand" data-testid="link-home">
          <span className="brand-symbol"><ArrowDownRight size={17} /></span>
          <span>SaveWise</span>
        </Link>
        <nav className="fund-nav-links site-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={activePage === item.id ? 'active' : undefined}
              aria-current={activePage === item.id ? 'page' : undefined}
              data-testid={item.testId}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="demo-pill site-status">
          <span className="demo-dot" aria-hidden="true" />
          {statusLabel}
        </span>
        <div className="site-auth-actions">
          <span className="site-auth-status" data-testid="text-guest-session">Guest session</span>
        </div>
      </div>
    </header>
  );
}
