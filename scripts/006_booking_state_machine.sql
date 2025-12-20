-- Add new booking states to the enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'technician_en_route';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_customer_confirmation';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed';

-- Create state machine validation function
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions TEXT[][];
BEGIN
  -- Define allowed state transitions as array of [from_state, to_state] pairs
  allowed_transitions := ARRAY[
    ['pending', 'pending_payment'],
    ['pending', 'cancelled'],
    ['pending_payment', 'confirmed'],
    ['pending_payment', 'cancelled'],
    ['confirmed', 'technician_en_route'],
    ['confirmed', 'cancelled'],
    ['technician_en_route', 'in_progress'],
    ['technician_en_route', 'cancelled'],
    ['in_progress', 'awaiting_customer_confirmation'],
    ['in_progress', 'cancelled'],
    ['awaiting_customer_confirmation', 'completed'],
    ['awaiting_customer_confirmation', 'disputed'],
    ['completed', 'disputed'],
    ['disputed', 'completed'],
    ['disputed', 'cancelled']
  ];

  -- Check if transition is allowed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT ARRAY[ARRAY[OLD.status::TEXT, NEW.status::TEXT]] <@ allowed_transitions THEN
      RAISE EXCEPTION 'Invalid booking status transition from % to %', OLD.status, NEW.status
        USING HINT = 'Only predefined state transitions are allowed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply state machine trigger
DROP TRIGGER IF EXISTS enforce_booking_state_machine ON public.bookings;
CREATE TRIGGER enforce_booking_state_machine
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();
