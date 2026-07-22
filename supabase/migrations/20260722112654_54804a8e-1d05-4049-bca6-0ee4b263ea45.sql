
-- 1. Extend businesses with settings + logo
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text;

-- 2. Settings audit table
CREATE TABLE IF NOT EXISTS public.settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  section text NOT NULL,
  setting_key text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.settings_audit TO authenticated;
GRANT ALL ON public.settings_audit TO service_role;

ALTER TABLE public.settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their business audit log"
  ON public.settings_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = settings_audit.business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can append audit events for their business"
  ON public.settings_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = settings_audit.business_id AND b.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_settings_audit_business_created
  ON public.settings_audit (business_id, created_at DESC);
