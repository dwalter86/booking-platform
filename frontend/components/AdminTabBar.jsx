import Link from 'next/link';

const tabs = [
  { id: 'settings',    label: 'Settings' },
  { id: 'admin-users', label: 'Admin Users' },
  { id: 'plans',       label: 'Plans' },
  { id: 'audit-log',   label: 'Audit Log' },
];

export default function AdminTabBar({ activeTab }) {
  return (
    <div className="av-seg">
      {tabs.map(({ id, label }) => (
        <Link
          key={id}
          href={`/administration?tab=${id}`}
          className={activeTab === id ? 'active' : ''}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
