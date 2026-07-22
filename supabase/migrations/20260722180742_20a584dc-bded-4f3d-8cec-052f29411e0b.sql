
REVOKE ALL ON FUNCTION public.is_business_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_business_owner_membership() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tg_business_owner_membership() TO service_role;
