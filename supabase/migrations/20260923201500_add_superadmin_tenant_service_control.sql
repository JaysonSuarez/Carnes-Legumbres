CREATE TABLE IF NOT EXISTS public.cl_tenant_service_access (
  "tenantId" text PRIMARY KEY CHECK ("tenantId" = 'andres'),
  active boolean NOT NULL DEFAULT true,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "updatedBy" text NOT NULL DEFAULT 'system'
);

ALTER TABLE public.cl_tenant_service_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cl_tenant_service_access FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cl_tenant_service_access TO service_role;

INSERT INTO public.cl_tenant_service_access ("tenantId", active, "updatedAt", "updatedBy")
VALUES ('andres', true, now(), 'system')
ON CONFLICT ("tenantId") DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cl_superadmin_login_attempts (
  "ipHash" text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "windowStartedAt" timestamptz NOT NULL DEFAULT now(),
  "blockedUntil" timestamptz,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cl_superadmin_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cl_superadmin_login_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cl_superadmin_login_attempts TO service_role;
