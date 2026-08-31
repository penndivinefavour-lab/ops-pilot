'use client';

import { usePathname } from 'next/navigation';

const topNavItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/activity', label: 'Activity' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="h-14 border-b border-ops-border bg-ops-surface/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <nav className="flex items-center gap-1">
          {topNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <span
                key={item.href}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-ops-accentDim text-ops-accent font-medium'
                    : 'text-ops-muted hover:text-ops-foreground'
                }`}
              >
                {item.label}
              </span>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm text-ops-muted">
          <span className="w-2 h-2 rounded-full bg-ops-green animate-pulse" />
          <span>Agent online</span>
        </div>
      </div>
    </header>
  );
}
