
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND owner_id = auth.uid()
  )
$$;
