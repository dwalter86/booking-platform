'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavItem({ label, href, icon }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [hrefPath, hrefQuery] = href.split('?');
  let active;
  if (hrefQuery) {
    // Tab-aware: an href like "/administration?tab=plans" is active only when
    // both the path and the current tab match (default tab = "settings").
    const hrefTab    = new URLSearchParams(hrefQuery).get('tab');
    const currentTab = searchParams.get('tab') || 'settings';
    active = pathname === hrefPath && currentTab === hrefTab;
  } else {
    active = pathname === hrefPath || (hrefPath !== '/dashboard' && pathname.startsWith(hrefPath));
  }

  return (
    <Link href={href} className={`av-nav-item${active ? ' active' : ''}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
