'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/projects', label: 'Projects', icon: '📁' },
  { href: '/tasks', label: 'Tasks', icon: '✅' },
  { href: '/incidents', label: 'Incidents', icon: '🔥' },
  { href: '/approvals', label: 'Approvals', icon: '⏳' },
  { href: '/activity', label: 'Activity', icon: '📋' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<{ accentColor: string } | null>(null);

  useEffect(() => {
    import('./theme').then(({ getTheme }) => setTheme(getTheme() ?? { accentColor: '#38bdf8' }));
  }, []);

  return (
    <aside className="w-64 border-r border-ops-border bg-ops-surface shrink-0">
      <div className="p-4 border-b border-ops-border">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="text-ops-accent">◆</span>
          <span>OpsPilot</span>
        </Link>
        <p className="text-ops-muted text-xs mt-1 ml-6">Human-Agent Operations Room</p>
      </div>

      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-ops-accentDim text-ops-accent font-medium'
                  : 'text-ops-foreground/80 hover:bg-ops-surfaceRaised hover:text-ops-foreground'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-ops-border mt-auto">
        <div className="text-xs text-ops-muted leading-relaxed">
          <p>Human decides. Agent reasons.</p>
          <p className="mt-1">WebMCP executes.</p>
        </div>
      </div>
    </aside>
  );
}
