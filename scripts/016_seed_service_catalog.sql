-- Seed service categories
INSERT INTO public.service_categories (name, description, icon_name, display_order) VALUES
  ('Plumbing', 'Water, pipes, drains, and fixtures', 'wrench', 1),
  ('Electrical', 'Wiring, outlets, lighting, and electrical repairs', 'zap', 2),
  ('HVAC', 'Heating, ventilation, and air conditioning', 'thermometer', 3),
  ('Carpentry', 'Wood repairs, installations, and custom work', 'hammer', 4),
  ('Appliance Repair', 'Repair and maintenance of home appliances', 'tool', 5),
  ('Painting', 'Interior and exterior painting services', 'paintbrush', 6),
  ('Cleaning', 'Deep cleaning and maintenance services', 'sparkles', 7),
  ('Landscaping', 'Outdoor maintenance and beautification', 'trees', 8)
ON CONFLICT (name) DO NOTHING;

-- Seed platform services (admin-controlled catalog)
INSERT INTO public.services (category_id, name, description, base_price, min_price, max_price, estimated_duration_minutes, warranty_days, emergency_supported) VALUES
  -- Plumbing
  ((SELECT id FROM public.service_categories WHERE name = 'Plumbing'), 
   'Drain Unclogging', 'Clear clogged drains and pipes', 89.99, 50.00, 150.00, 60, 30, true),
  ((SELECT id FROM public.service_categories WHERE name = 'Plumbing'), 
   'Faucet Repair', 'Fix leaking or broken faucets', 79.99, 40.00, 120.00, 45, 60, false),
  ((SELECT id FROM public.service_categories WHERE name = 'Plumbing'), 
   'Toilet Repair', 'Repair running or clogged toilets', 99.99, 60.00, 180.00, 60, 60, true),
  ((SELECT id FROM public.service_categories WHERE name = 'Plumbing'), 
   'Water Heater Repair', 'Diagnose and repair water heater issues', 149.99, 100.00, 300.00, 120, 90, true),
  
  -- Electrical
  ((SELECT id FROM public.service_categories WHERE name = 'Electrical'), 
   'Outlet Installation', 'Install new electrical outlets', 89.99, 50.00, 150.00, 60, 90, false),
  ((SELECT id FROM public.service_categories WHERE name = 'Electrical'), 
   'Light Fixture Installation', 'Install ceiling or wall light fixtures', 79.99, 40.00, 140.00, 60, 90, false),
  ((SELECT id FROM public.service_categories WHERE name = 'Electrical'), 
   'Electrical Panel Inspection', 'Inspect and diagnose electrical panel issues', 129.99, 80.00, 200.00, 90, 30, true),
  
  -- HVAC
  ((SELECT id FROM public.service_categories WHERE name = 'HVAC'), 
   'AC Repair', 'Diagnose and repair air conditioning units', 149.99, 100.00, 300.00, 120, 90, true),
  ((SELECT id FROM public.service_categories WHERE name = 'HVAC'), 
   'Furnace Maintenance', 'Clean and maintain heating systems', 119.99, 80.00, 200.00, 90, 60, false),
  
  -- Carpentry
  ((SELECT id FROM public.service_categories WHERE name = 'Carpentry'), 
   'Door Repair', 'Fix or replace damaged doors', 99.99, 60.00, 180.00, 90, 60, false),
  ((SELECT id FROM public.service_categories WHERE name = 'Carpentry'), 
   'Cabinet Installation', 'Install kitchen or bathroom cabinets', 199.99, 150.00, 400.00, 180, 90, false),
  
  -- Appliance Repair
  ((SELECT id FROM public.service_categories WHERE name = 'Appliance Repair'), 
   'Refrigerator Repair', 'Diagnose and repair refrigerator issues', 129.99, 80.00, 250.00, 90, 60, true),
  ((SELECT id FROM public.service_categories WHERE name = 'Appliance Repair'), 
   'Washing Machine Repair', 'Fix washing machine problems', 119.99, 70.00, 220.00, 90, 60, false),
  
  -- Painting
  ((SELECT id FROM public.service_categories WHERE name = 'Painting'), 
   'Room Painting', 'Paint interior room walls', 199.99, 150.00, 400.00, 240, 30, false),
  
  -- Cleaning
  ((SELECT id FROM public.service_categories WHERE name = 'Cleaning'), 
   'Deep House Cleaning', 'Thorough cleaning of entire home', 149.99, 100.00, 300.00, 180, 7, false),
  
  -- Landscaping
  ((SELECT id FROM public.service_categories WHERE name = 'Landscaping'), 
   'Lawn Mowing', 'Regular lawn maintenance and mowing', 59.99, 40.00, 100.00, 60, 0, false),
  ((SELECT id FROM public.service_categories WHERE name = 'Landscaping'), 
   'Tree Trimming', 'Trim and shape trees and shrubs', 129.99, 80.00, 250.00, 120, 0, false);

-- Enable services in major cities (example)
INSERT INTO public.service_city_availability (service_id, city, state, is_enabled)
SELECT s.id, city, state, true
FROM public.services s
CROSS JOIN (VALUES 
  ('New York', 'NY'),
  ('Los Angeles', 'CA'),
  ('Chicago', 'IL'),
  ('Houston', 'TX'),
  ('Phoenix', 'AZ'),
  ('Philadelphia', 'PA'),
  ('San Antonio', 'TX'),
  ('San Diego', 'CA'),
  ('Dallas', 'TX'),
  ('Austin', 'TX')
) AS cities(city, state)
ON CONFLICT DO NOTHING;
