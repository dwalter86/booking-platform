# Booking Platform API

Generated API scaffold for the multi-tenant booking platform.

## Included capabilities

- Tenant resolution from subdomain or `x-tenant-subdomain`
- JWT-based admin authentication
- Resource CRUD
- Public provisional booking requests
- Admin booking creation, confirmation, cancellation
- Unavailability block CRUD
- Availability read endpoint
- Admin user CRUD
- Plans catalogue and tenant entitlements
- Calendar connection CRUD
- Audit log reads
- PostgreSQL RLS compatibility via `app.set_current_tenant()` per request transaction

## Testing notes

For local/testing requests where DNS is not configured, send:

```bash
-H "x-tenant-subdomain: yourtenant"
```

## Start

```bash
npm start
```

## Health

```bash
curl http://127.0.0.1:3001/health
```
