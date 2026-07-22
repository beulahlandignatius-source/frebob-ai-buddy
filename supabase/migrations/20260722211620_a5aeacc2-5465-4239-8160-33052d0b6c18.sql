
-- ============================================================
-- B1: Approval pipeline schema (additive, forward-only)
-- ============================================================

-- 1. Extend role enum (keep existing values for back-compat) -----
ALTER TYPE public.business_member_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.business_member_role ADD VALUE IF NOT EXISTS 'sales_attendant';
ALTER TYPE public.business_member_role ADD VALUE IF NOT EXISTS 'inventory_staff';
ALTER TYPE public.business_member_role ADD VALUE IF NOT EXISTS 'read_only';

-- 2. Role helper functions --------------------------------------
CREATE OR REPLACE FUNCTION public.has_business_role(_business_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id
      AND user_id = auth.uid()
      AND role::text = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_write_business(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_business_role(_business_id, ARRAY['owner','admin','manager'])
$$;

CREATE OR REPLACE FUNCTION public.can_approve_records(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_business_role(_business_id, ARRAY['owner','admin','manager'])
$$;

CREATE OR REPLACE FUNCTION public.can_write_sales(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_business_role(_business_id, ARRAY['owner','admin','manager','sales_attendant'])
$$;

CREATE OR REPLACE FUNCTION public.can_write_inventory(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_business_role(_business_id, ARRAY['owner','admin','manager','inventory_staff'])
$$;

-- 3. Column additions on existing tables ------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS selling_price numeric CHECK (selling_price IS NULL OR selling_price >= 0),
  ADD COLUMN IF NOT EXISTS available_stock numeric NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
  ADD COLUMN IF NOT EXISTS reserved_stock numeric NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','removed')),
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. source_inputs ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.source_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('paste','voice','whatsapp_audio','upload','scan','manual')),
  language text NOT NULL DEFAULT 'auto',
  raw_text text,
  file_path text,
  file_mime text,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','extracted','failed')),
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS source_inputs_business_idx ON public.source_inputs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS source_inputs_status_idx ON public.source_inputs(business_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_inputs TO authenticated;
GRANT ALL ON public.source_inputs TO service_role;
ALTER TABLE public.source_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read source inputs" ON public.source_inputs
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "sales+ create source inputs" ON public.source_inputs
  FOR INSERT WITH CHECK (public.can_write_sales(business_id) OR public.can_write_inventory(business_id));
CREATE POLICY "sales+ update own source inputs" ON public.source_inputs
  FOR UPDATE USING (public.can_write_sales(business_id) OR public.can_write_inventory(business_id))
  WITH CHECK (public.can_write_sales(business_id) OR public.can_write_inventory(business_id));
CREATE POLICY "managers delete source inputs" ON public.source_inputs
  FOR DELETE USING (public.can_write_business(business_id));

CREATE TRIGGER source_inputs_set_updated_at BEFORE UPDATE ON public.source_inputs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. ai_extractions ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_input_id uuid NOT NULL REFERENCES public.source_inputs(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  confidence text NOT NULL DEFAULT 'needs_review' CHECK (confidence IN ('high','needs_review','missing_information')),
  needs_review boolean NOT NULL DEFAULT true,
  missing_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  model text,
  latency_ms integer,
  status text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_extractions_business_idx ON public.ai_extractions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_extractions_status_idx ON public.ai_extractions(business_id, status);
CREATE INDEX IF NOT EXISTS ai_extractions_source_idx ON public.ai_extractions(source_input_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_extractions TO authenticated;
GRANT ALL ON public.ai_extractions TO service_role;
ALTER TABLE public.ai_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read extractions" ON public.ai_extractions
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "sales+ write extractions" ON public.ai_extractions
  FOR INSERT WITH CHECK (public.can_write_sales(business_id) OR public.can_write_inventory(business_id));
CREATE POLICY "managers update extractions" ON public.ai_extractions
  FOR UPDATE USING (public.can_approve_records(business_id))
  WITH CHECK (public.can_approve_records(business_id));
CREATE POLICY "managers delete extractions" ON public.ai_extractions
  FOR DELETE USING (public.can_write_business(business_id));

CREATE TRIGGER ai_extractions_set_updated_at BEFORE UPDATE ON public.ai_extractions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. approved_record_items --------------------------------------
CREATE TABLE IF NOT EXISTS public.approved_record_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  approved_record_id uuid NOT NULL REFERENCES public.approved_records(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant text,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  unit_price numeric CHECK (unit_price IS NULL OR unit_price >= 0),
  line_total numeric CHECK (line_total IS NULL OR line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approved_record_items_record_idx ON public.approved_record_items(approved_record_id);
CREATE INDEX IF NOT EXISTS approved_record_items_business_idx ON public.approved_record_items(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approved_record_items TO authenticated;
GRANT ALL ON public.approved_record_items TO service_role;
ALTER TABLE public.approved_record_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read approved items" ON public.approved_record_items
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "managers write approved items" ON public.approved_record_items
  FOR ALL USING (public.can_approve_records(business_id))
  WITH CHECK (public.can_approve_records(business_id));

-- 7. orders ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reference text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  approved_record_id uuid REFERENCES public.approved_records(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('enquiry','reserved','pending','awaiting_pickup','awaiting_delivery','completed','cancelled','unknown')),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid numeric NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partially_paid','paid','unknown')),
  delivery_mode text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, reference)
);
CREATE INDEX IF NOT EXISTS orders_business_idx ON public.orders(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(business_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read orders" ON public.orders
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "sales+ create orders" ON public.orders
  FOR INSERT WITH CHECK (public.can_write_sales(business_id));
CREATE POLICY "sales+ update orders" ON public.orders
  FOR UPDATE USING (public.can_write_sales(business_id))
  WITH CHECK (public.can_write_sales(business_id));
CREATE POLICY "managers delete orders" ON public.orders
  FOR DELETE USING (public.can_write_business(business_id));

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 8. order_items -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant text,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total numeric NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_business_idx ON public.order_items(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read order items" ON public.order_items
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "sales+ write order items" ON public.order_items
  FOR ALL USING (public.can_write_sales(business_id))
  WITH CHECK (public.can_write_sales(business_id));

-- Auto-compute line_total
CREATE OR REPLACE FUNCTION public.tg_compute_order_item_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.line_total := COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_price,0);
  RETURN NEW;
END $$;
CREATE TRIGGER order_items_compute_total BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_compute_order_item_total();

-- 9. payments: link to orders -----------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments(order_id);

-- 10. assistant_queries -----------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  language text,
  latency_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assistant_queries_business_idx ON public.assistant_queries(business_id, created_at DESC);
GRANT SELECT, INSERT ON public.assistant_queries TO authenticated;
GRANT ALL ON public.assistant_queries TO service_role;
ALTER TABLE public.assistant_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read assistant queries" ON public.assistant_queries
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "members insert assistant queries" ON public.assistant_queries
  FOR INSERT WITH CHECK (public.is_business_member(business_id) AND user_id = auth.uid());

-- 11. evidence_links --------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_input_id uuid REFERENCES public.source_inputs(id) ON DELETE CASCADE,
  extraction_id uuid REFERENCES public.ai_extractions(id) ON DELETE CASCADE,
  approved_record_id uuid REFERENCES public.approved_records(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  inventory_event_id uuid REFERENCES public.inventory_events(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_links_business_idx ON public.evidence_links(business_id);
CREATE INDEX IF NOT EXISTS evidence_links_record_idx ON public.evidence_links(approved_record_id);
CREATE INDEX IF NOT EXISTS evidence_links_source_idx ON public.evidence_links(source_input_id);
GRANT SELECT, INSERT, DELETE ON public.evidence_links TO authenticated;
GRANT ALL ON public.evidence_links TO service_role;
ALTER TABLE public.evidence_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read evidence" ON public.evidence_links
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "managers write evidence" ON public.evidence_links
  FOR ALL USING (public.can_approve_records(business_id))
  WITH CHECK (public.can_approve_records(business_id));
