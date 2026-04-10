import { cookies, headers } from 'next/headers';
import { config } from '../lib/config';

async function getEntitlementState() {
  try {
    const token = cookies().get('booking_admin_token')?.value;
    if (!token) return null;

    const headerStore  = headers();
    const forwardedHost = headerStore.get('x-forwarded-host');
    const hostHeader   = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
    const tenantHost   = hostHeader.split(':')[0];
    const subdomain    = tenantHost.split('.')[0] || null;

    const response = await fetch(`${config.apiBaseUrl}/api/entitlement`, {
      headers: {
        'Authorization':      `Bearer ${token}`,
        'x-tenant-subdomain': subdomain,
        'Content-Type':       'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default async function TrialGraceBanner() {
  const entitlement = await getEntitlementState();

  if (!entitlement) return null;

  // Active trial — show a subtle info bar with days remaining
  if (entitlement.state === 'trial_active' && entitlement.periodEnd) {
    const daysLeft = Math.ceil(
      (new Date(entitlement.periodEnd) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft > 7) return null; // Only show when getting close

    return (
      <div className="alert alert-info alert-dismissible mb-0 rounded-0 border-0 border-bottom" role="alert">
        <div className="container-xl d-flex align-items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="icon flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-grow-1">
            Your trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
            Enjoying the platform? Subscribe before your trial ends to keep full access.
          </div>
          <a href="mailto:hello@availio.co?subject=Subscribe to Availio" className="btn btn-sm btn-info">
            Subscribe now
          </a>
        </div>
      </div>
    );
  }

  // Grace period — more urgent warning
  if (entitlement.state === 'trial_grace') {
    const days = entitlement.graceDaysRemaining ?? 0;

    return (
      <div className="alert alert-warning alert-dismissible mb-0 rounded-0 border-0 border-bottom" role="alert">
        <div className="container-xl d-flex align-items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="icon flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M12 9v4" />
            <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
            <path d="M12 16h.01" />
          </svg>
          <div className="flex-grow-1">
            <strong>Your trial has ended.</strong>{' '}
            {days > 0 ? (
              <>You have <strong>{days} day{days !== 1 ? 's' : ''}</strong> left in your grace period before access is restricted.</>
            ) : (
              <>Your grace period has ended. Please subscribe to restore full access.</>
            )}
          </div>
          <a href="mailto:hello@availio.co?subject=Subscribe to Availio" className="btn btn-sm btn-warning">
            Subscribe now
          </a>
        </div>
      </div>
    );
  }

  return null;
}
