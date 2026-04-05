export async function getTenantEntitlements(client, tenantId) {
  const subscriptionResult = await client.query(
    `SELECT ts.id,
            ts.tenant_id,
            ts.status,
            ts.current_period_start,
            ts.current_period_end,
            ts.overrides,
            p.id AS plan_id,
            p.code AS plan_code,
            p.name AS plan_name
       FROM public.tenant_subscriptions ts
       JOIN public.plans p ON p.id = ts.plan_id
      WHERE ts.tenant_id = $1
      ORDER BY ts.created_at DESC
      LIMIT 1`,
    [tenantId]
  );

  const subscription = subscriptionResult.rows[0] || null;
  if (!subscription) {
    return {
      subscription: null,
      limits: {},
      features: {},
      usage: {}
    };
  }

  const [limitsResult, featuresResult, usageResult] = await Promise.all([
    client.query(
      `SELECT metric_key, limit_value, period
         FROM public.plan_limits
        WHERE plan_id = $1`,
      [subscription.plan_id]
    ),
    client.query(
      `SELECT feature_key, is_enabled, config
         FROM public.plan_features
        WHERE plan_id = $1`,
      [subscription.plan_id]
    ),
    client.query(
      `SELECT metric_key, usage_value, period_start, period_end
         FROM public.tenant_usage_counters
        WHERE tenant_id = $1
          AND period_end >= now() - interval '40 days'`,
      [tenantId]
    )
  ]);

  const limits = {};
  for (const row of limitsResult.rows) {
    limits[`${row.metric_key}:${row.period}`] = row.limit_value;
  }

  const features = {};
  for (const row of featuresResult.rows) {
    features[row.feature_key] = {
      enabled: row.is_enabled,
      config: row.config || {}
    };
  }

  const usage = {};
  for (const row of usageResult.rows) {
    usage[row.metric_key] = {
      usage_value: Number(row.usage_value),
      period_start: row.period_start,
      period_end: row.period_end
    };
  }

  return { subscription, limits, features, usage };
}

export async function incrementMonthlyUsage(client, tenantId, metricKey, incrementBy = 1) {
  const periodResult = await client.query(
    `SELECT date_trunc('month', now()) AS period_start,
            date_trunc('month', now()) + interval '1 month' AS period_end`
  );
  const periodStart = periodResult.rows[0].period_start;
  const periodEnd = periodResult.rows[0].period_end;

  await client.query(
    `INSERT INTO public.tenant_usage_counters (tenant_id, metric_key, period_start, period_end, usage_value)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, metric_key, period_start, period_end)
     DO UPDATE SET usage_value = public.tenant_usage_counters.usage_value + EXCLUDED.usage_value,
                   updated_at = now()`,
    [tenantId, metricKey, periodStart, periodEnd, incrementBy]
  );
}

export function checkAbsoluteLimit(currentValue, limitValue) {
  if (limitValue == null) return true;
  return Number(currentValue) < Number(limitValue);
}

export function checkMonthlyLimit(currentValue, limitValue, incrementBy = 1) {
  if (limitValue == null) return true;
  return Number(currentValue) + Number(incrementBy) <= Number(limitValue);
}
