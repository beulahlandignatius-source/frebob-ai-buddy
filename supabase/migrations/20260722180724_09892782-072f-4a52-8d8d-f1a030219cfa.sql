
-- 1. Membership role + table
DO $$ BEGIN
  CREATE TYPE public.business_member_role AS ENUM ('owner','admin','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.business_member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS business_members_user_idx ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS business_members_business_idx ON public.business_members(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- 2. Helper: is caller a member of the given business?
CREATE OR REPLACE FUNCTION public.is_business_member(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = auth.uid()
  )
$$;

-- 3. Backfill: every existing business owner becomes an 'owner' member.
INSERT INTO public.business_members (business_id, user_id, role)
SELECT id, owner_id, 'owner'::public.business_member_role
FROM public.businesses
WHERE owner_id IS NOT NULL
ON CONFLICT (business_id, user_id) DO NOTHING;

-- 4. Trigger: adding a business auto-creates an owner membership.
CREATE OR REPLACE FUNCTION public.tg_business_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (business_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS business_owner_membership ON public.businesses;
CREATE TRIGGER business_owner_membership
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_business_owner_membership();

-- 5. Membership updated_at
DROP TRIGGER IF EXISTS business_members_set_updated_at ON public.business_members;
CREATE TRIGGER business_members_set_updated_at
BEFORE UPDATE ON public.business_members
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. Policies on business_members
DROP POLICY IF EXISTS "Members read own memberships" ON public.business_members;
CREATE POLICY "Members read own memberships" ON public.business_members
FOR SELECT USING (user_id = auth.uid() OR public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners manage memberships" ON public.business_members;
CREATE POLICY "Owners manage memberships" ON public.business_members
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);

-- 7. businesses: allow members to read
DROP POLICY IF EXISTS "Users manage own businesses" ON public.businesses;
CREATE POLICY "Members read businesses" ON public.businesses
FOR SELECT USING (public.is_business_member(id) OR owner_id = auth.uid());
CREATE POLICY "Owners write businesses" ON public.businesses
FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update businesses" ON public.businesses
FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete businesses" ON public.businesses
FOR DELETE USING (auth.uid() = owner_id);

-- 8. Swap owner-only policies to member policies on all scoped tables.
DROP POLICY IF EXISTS "Owner manages approved records" ON public.approved_records;
CREATE POLICY "Members manage approved records" ON public.approved_records
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages conversations" ON public.conversations;
CREATE POLICY "Members manage conversations" ON public.conversations
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages customers" ON public.customers;
CREATE POLICY "Members manage customers" ON public.customers
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages duplicate reviews" ON public.duplicate_reviews;
CREATE POLICY "Members manage duplicate reviews" ON public.duplicate_reviews
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner inserts inventory events" ON public.inventory_events;
DROP POLICY IF EXISTS "Owner reads inventory events" ON public.inventory_events;
CREATE POLICY "Members read inventory events" ON public.inventory_events
FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert inventory events" ON public.inventory_events
FOR INSERT WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages notifications" ON public.notifications;
CREATE POLICY "Members manage notifications" ON public.notifications
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages order status" ON public.order_status_overrides;
CREATE POLICY "Members manage order status" ON public.order_status_overrides
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages payments" ON public.payments;
CREATE POLICY "Members manage payments" ON public.payments
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages products" ON public.products;
CREATE POLICY "Members manage products" ON public.products
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages scan conversions" ON public.scan_conversions;
CREATE POLICY "Members manage scan conversions" ON public.scan_conversions
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner manages scans" ON public.scans;
CREATE POLICY "Members manage scans" ON public.scans
FOR ALL USING (public.is_business_member(business_id))
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owners can append audit events for their business" ON public.settings_audit;
DROP POLICY IF EXISTS "Owners can read their business audit log" ON public.settings_audit;
CREATE POLICY "Members read audit log" ON public.settings_audit
FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members append audit log" ON public.settings_audit
FOR INSERT WITH CHECK (actor_id = auth.uid() AND public.is_business_member(business_id));
