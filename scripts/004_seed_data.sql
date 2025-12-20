-- Insert service categories
INSERT INTO public.service_categories (name, description, icon_name) VALUES
  ('Plumbing', 'Pipe repairs, installations, and maintenance', 'wrench'),
  ('Electrical', 'Electrical repairs, installations, and inspections', 'zap'),
  ('HVAC', 'Heating, ventilation, and air conditioning services', 'wind'),
  ('Carpentry', 'Woodwork, furniture repair, and installations', 'hammer'),
  ('Painting', 'Interior and exterior painting services', 'paintbrush'),
  ('Appliance Repair', 'Repair and maintenance of household appliances', 'settings'),
  ('Landscaping', 'Lawn care, gardening, and outdoor maintenance', 'flower'),
  ('Cleaning', 'Professional house and office cleaning', 'sparkles')
ON CONFLICT (name) DO NOTHING;
