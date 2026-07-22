
REVOKE EXECUTE ON FUNCTION public.is_business_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_business_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO authenticated;
