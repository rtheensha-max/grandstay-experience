REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_room_unavailable_dates(UUID, DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rooms_available(UUID, DATE, DATE) FROM PUBLIC;

DROP POLICY "Anyone can view active rooms" ON public.rooms;
CREATE POLICY "Visitors can view active rooms" ON public.rooms
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Signed-in users can view rooms" ON public.rooms
  FOR SELECT TO authenticated USING (is_active = true OR public.is_admin());

DROP POLICY "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Visitors can view active coupons" ON public.coupons
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Signed-in users can view coupons" ON public.coupons
  FOR SELECT TO authenticated USING (is_active = true OR public.is_admin());