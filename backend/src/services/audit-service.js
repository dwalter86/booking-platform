export async function writeAudit(client, tenantId, actorUserId, entityType, entityId, action, details = {}) {
  await client.query(
    `INSERT INTO public.audit_log (tenant_id, actor_user_id, entity_type, entity_id, action, details)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [tenantId, actorUserId || null, entityType, entityId || null, action, JSON.stringify(details)]
  );
}
