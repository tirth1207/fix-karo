-- RLS Policies for Service Catalog

-- Services: Everyone can read active services, only admins can modify
DROP POLICY IF EXISTS services_select_policy ON public.services;
CREATE POLICY services_select_policy ON public.services
  FOR SELECT
  USING (is_active = TRUE OR auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

DROP POLICY IF EXISTS services_admin_all ON public.services;
CREATE POLICY services_admin_all ON public.services
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

-- Service city availability: Same as services
DROP POLICY IF EXISTS service_city_select ON public.service_city_availability;
CREATE POLICY service_city_select ON public.service_city_availability
  FOR SELECT
  USING (is_enabled = TRUE OR auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

DROP POLICY IF EXISTS service_city_admin_all ON public.service_city_availability;
CREATE POLICY service_city_admin_all ON public.service_city_availability
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

-- Technician services: Technicians manage own, customers read active, admins see all
DROP POLICY IF EXISTS tech_services_select ON public.technician_services;
CREATE POLICY tech_services_select ON public.technician_services
  FOR SELECT
  USING (
    -- Customers see approved + active services
    (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'customer') 
     AND is_active = TRUE AND approval_status = 'approved')
    OR
    -- Technicians see own services
    (technician_id = auth.uid())
    OR
    -- Admins see all
    (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
  );

DROP POLICY IF EXISTS tech_services_insert ON public.technician_services;
CREATE POLICY tech_services_insert ON public.technician_services
  FOR INSERT
  WITH CHECK (
    technician_id = auth.uid() AND
    technician_id IN (SELECT id FROM public.profiles WHERE role = 'technician')
  );

DROP POLICY IF EXISTS tech_services_update ON public.technician_services;
CREATE POLICY tech_services_update ON public.technician_services
  FOR UPDATE
  USING (
    technician_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- Price audit logs: Admins and Customer only
DROP POLICY IF EXISTS price_audit_admin_only ON public.price_audit_logs;
CREATE POLICY price_audit_admin_only ON public.price_audit_logs
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));


DROP POLICY IF EXISTS price_audit_customer_insert_only ON public.price_audit_logs;
CREATE POLICY price_audit_customer_insert_only ON public.price_audit_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'customer'
    )
  );

-- Preferred technicians: Users see own, admins see all
DROP POLICY IF EXISTS preferred_tech_select ON public.preferred_technicians;
CREATE POLICY preferred_tech_select ON public.preferred_technicians
  FOR SELECT
  USING (
    customer_id = auth.uid() OR
    technician_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS preferred_tech_modify ON public.preferred_technicians;
CREATE POLICY preferred_tech_modify ON public.preferred_technicians
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));
