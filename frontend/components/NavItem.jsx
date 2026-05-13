'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavItem({ label, href, icon }) {
  const pathname = usePathname();
  const active   = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link href={href} className={`av-nav-item${active ? ' active' : ''}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
