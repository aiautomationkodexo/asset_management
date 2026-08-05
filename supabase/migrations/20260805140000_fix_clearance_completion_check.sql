-- Fix: clearance completeness must reflect real custody state (zero open
-- assignments for the employee), not just the clearance_items' own status
-- flags — those could be marked "returned" without the underlying
-- assignment ever being closed. Re-derive from assignments directly.

CREATE OR REPLACE FUNCTION trig_check_clearance_complete() RETURNS TRIGGER AS $$
DECLARE
    v_employee_id UUID;
BEGIN
    SELECT employee_id INTO v_employee_id FROM offboarding_clearances WHERE id = NEW.clearance_id;

    IF NOT EXISTS (
        SELECT 1 FROM assignments WHERE employee_id = v_employee_id AND returned_at IS NULL
    ) THEN
        UPDATE offboarding_clearances
        SET status = 'complete', completed_at = now()
        WHERE id = NEW.clearance_id AND status != 'complete';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also recheck whenever an assignment itself is returned directly (e.g.
-- via the normal Return flow on the asset detail page, not through the
-- offboarding checklist at all).
CREATE OR REPLACE FUNCTION trig_check_clearance_on_return() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
        UPDATE offboarding_clearances
        SET status = 'complete', completed_at = now()
        WHERE employee_id = NEW.employee_id
          AND status != 'complete'
          AND NOT EXISTS (
              SELECT 1 FROM assignments WHERE employee_id = NEW.employee_id AND returned_at IS NULL
          );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assignment_returned_clearance_check ON assignments;
CREATE TRIGGER assignment_returned_clearance_check
AFTER UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION trig_check_clearance_on_return();
