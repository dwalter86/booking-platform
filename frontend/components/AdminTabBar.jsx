import Link from 'next/link';

const tabs = [
  { id: 'settings',    label: 'Settings' },
  { id: 'admin-users', label: 'Admin Users' },
  { id: 'plans',       label: 'Plans' },
  { id: 'audit-log',   label: 'Audit Log' },
];

export default function AdminTabBar({ activeTab }) {
  return (
    <div className="d-flex gap-2">
      {tabs.map(({ id, label }) => (
        <Link
          key={id}
          href={`/administration?tab=${id}`}
          className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-outline-secondary'}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
