
-- Shared updated_at trigger already exists as public.tg_set_updated_at

-- Helper: does the current user own the business?
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND owner_id = auth.uid()
  )
$$;

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_business_idx ON public.customers(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  variant text,
  sku text,
  unit_price numeric,
  cost_price numeric,
  reorder_level numeric,
  image_url text,
  quality_tier text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_business_idx ON public.products(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages products" ON public.products FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- INVENTORY EVENTS (append-only)
-- ============================================================
CREATE TABLE public.inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant text,
  quantity_delta numeric NOT NULL,
  unit_cost numeric,
  event_type text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_events_business_idx ON public.inventory_events(business_id);
CREATE INDEX inventory_events_product_name_idx ON public.inventory_events(business_id, product_name);
CREATE INDEX inventory_events_source_idx ON public.inventory_events(business_id, source_id);
GRANT SELECT, INSERT ON public.inventory_events TO authenticated;
GRANT ALL ON public.inventory_events TO service_role;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads inventory events" ON public.inventory_events FOR SELECT TO authenticated
  USING (public.is_business_owner(business_id));
CREATE POLICY "Owner inserts inventory events" ON public.inventory_events FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner(business_id));

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  file_name text,
  language text NOT NULL DEFAULT 'auto',
  text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  draft jsonb,
  edited jsonb,
  approved_record_id uuid,
  processing_mode text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_business_idx ON public.conversations(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages conversations" ON public.conversations FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));
CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- APPROVED RECORDS (Business Memory)
-- ============================================================
CREATE TABLE public.approved_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reference text NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_label text,
  data jsonb NOT NULL,
  source_text text,
  source_type text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, reference)
);
CREATE INDEX approved_records_business_idx ON public.approved_records(business_id);
CREATE INDEX approved_records_reference_idx ON public.approved_records(business_id, reference);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approved_records TO authenticated;
GRANT ALL ON public.approved_records TO service_role;
ALTER TABLE public.approved_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages approved records" ON public.approved_records FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_reference text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  method text NOT NULL,
  reference text,
  date timestamptz NOT NULL DEFAULT now(),
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_by_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_business_idx ON public.payments(business_id);
CREATE INDEX payments_order_ref_idx ON public.payments(business_id, order_reference);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));

-- ============================================================
-- ORDER STATUS OVERRIDES
-- ============================================================
CREATE TABLE public.order_status_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_reference text NOT NULL,
  status text NOT NULL,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, order_reference)
);
CREATE INDEX order_status_overrides_business_idx ON public.order_status_overrides(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_status_overrides TO authenticated;
GRANT ALL ON public.order_status_overrides TO service_role;
ALTER TABLE public.order_status_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages order status" ON public.order_status_overrides FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  severity text NOT NULL DEFAULT 'info',
  dedupe_key text,
  related_type text,
  related_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, dedupe_key)
);
CREATE INDEX notifications_business_idx ON public.notifications(business_id);
CREATE INDEX notifications_unread_idx ON public.notifications(business_id, read_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));

-- ============================================================
-- SCANS
-- ============================================================
CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text,
  document_type text,
  status text NOT NULL DEFAULT 'draft',
  language text,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  extraction jsonb,
  edited jsonb,
  review_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scans_business_idx ON public.scans(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages scans" ON public.scans FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));
CREATE TRIGGER scans_set_updated_at BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- SCAN CONVERSIONS
-- ============================================================
CREATE TABLE public.scan_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text NOT NULL,
  target_reference text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, scan_id, target_type, target_id)
);
CREATE INDEX scan_conversions_business_idx ON public.scan_conversions(business_id);
CREATE INDEX scan_conversions_scan_idx ON public.scan_conversions(scan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_conversions TO authenticated;
GRANT ALL ON public.scan_conversions TO service_role;
ALTER TABLE public.scan_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages scan conversions" ON public.scan_conversions FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));

-- ============================================================
-- DUPLICATE REVIEWS (customer merge history)
-- ============================================================
CREATE TABLE public.duplicate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  group_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  primary_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  merged_customer_ids uuid[] DEFAULT '{}',
  snapshot jsonb,
  resolved_at timestamptz,
  undo_expires_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, group_key)
);
CREATE INDEX duplicate_reviews_business_idx ON public.duplicate_reviews(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicate_reviews TO authenticated;
GRANT ALL ON public.duplicate_reviews TO service_role;
ALTER TABLE public.duplicate_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages duplicate reviews" ON public.duplicate_reviews FOR ALL TO authenticated
  USING (public.is_business_owner(business_id)) WITH CHECK (public.is_business_owner(business_id));
CREATE TRIGGER duplicate_reviews_set_updated_at BEFORE UPDATE ON public.duplicate_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
