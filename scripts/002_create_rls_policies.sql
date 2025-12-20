-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for technician_profiles
CREATE POLICY "Anyone can view verified technicians" ON public.technician_profiles
  FOR SELECT USING (verification_status = 'verified' AND is_active = true);

CREATE POLICY "Technicians can update their own profile" ON public.technician_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Technicians can insert their own profile" ON public.technician_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all technicians" ON public.technician_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update any technician" ON public.technician_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for service_categories
CREATE POLICY "Anyone can view active categories" ON public.service_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.service_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for technician_services
CREATE POLICY "Anyone can view active services" ON public.technician_services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Technicians can manage their services" ON public.technician_services
  FOR ALL USING (auth.uid() = technician_id);

-- RLS Policies for bookings
CREATE POLICY "Customers can view their bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Technicians can view their bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.technician_profiles WHERE id = bookings.technician_id
    )
  );

CREATE POLICY "Customers can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their pending bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = customer_id AND status = 'pending'
  );

CREATE POLICY "Technicians can update their bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.technician_profiles WHERE id = bookings.technician_id
    )
  );

CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for payments
CREATE POLICY "Customers can view their payments" ON public.payments
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Technicians can view their payments" ON public.payments
  FOR SELECT USING (auth.uid() = technician_id);

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews for their bookings" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.customer_id = auth.uid()
        AND bookings.status = 'completed'
    )
  );

CREATE POLICY "Technicians can respond to their reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = technician_id);

-- RLS Policies for fraud_metrics
CREATE POLICY "Admins can view all fraud metrics" ON public.fraud_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert fraud metrics" ON public.fraud_metrics
  FOR INSERT WITH CHECK (true);

-- RLS Policies for fraud_alerts
CREATE POLICY "Admins can view all fraud alerts" ON public.fraud_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage fraud alerts" ON public.fraud_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view their own activity" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
