COMMENT ON TABLE role IS 'User roles, e.g. student, lecturer, accounting, marketing.';
COMMENT ON TABLE permissions IS 'Catalogue of actions a user can be allowed to perform.';
COMMENT ON TABLE email_parm IS 'Allowed institutional email formats used to validate user emails.';
COMMENT ON TABLE users IS 'Everyone who uses the system. Login is passwordless through Supabase Auth (auth.users).';
COMMENT ON COLUMN users.id IS 'Institutional ID: S = student, L = lecturer, A = administrative staff, followed by up to 7 digits (e.g. S1234567).';
COMMENT ON COLUMN users.auth_user_id IS 'Supabase Auth identity (auth.users.id) used to sign in. One-to-one. Created by the admin-create-user Edge Function together with this row.';
COMMENT ON TABLE user_permission IS 'Per-user permission overrides that grant or deny on top of the role.';
COMMENT ON COLUMN user_permission.modifier_type IS 'grant = add permission, deny = remove it even if the role has it.';
COMMENT ON TABLE role_permission IS 'Permissions every user with a role receives.';
COMMENT ON TABLE frequency IS 'How often a scheduled class repeats.';
COMMENT ON TABLE academic_period IS 'Terms or semesters that schedules belong to.';
COMMENT ON TABLE class IS 'Subjects or units offered.';
COMMENT ON TABLE location IS 'Rooms or spaces where classes take place.';
COMMENT ON COLUMN location.qr_secret_seed IS 'Secret seed used to generate the location''s rotating QR code. Stored as raw bytes. NULL = location has no QR check-in. Never readable by the Data API roles; only Edge Functions (service_role) use it.';
COMMENT ON TABLE beacon IS 'Bluetooth (iBeacon) devices used to confirm a student is in the room.';
COMMENT ON TABLE nfc_tags IS 'NFC tags placed in locations that students tap to check in.';
COMMENT ON COLUMN nfc_tags.payload_token IS 'Token written to the tag and validated by the server on tap. Never readable by the Data API roles.';
COMMENT ON TABLE class_schedule IS 'Recurring timetable slot for a class in a period.';
COMMENT ON COLUMN class_schedule.week_day IS 'ISO day of week: 1 = Monday ... 7 = Sunday. Matches EXTRACT(ISODOW FROM date).';
COMMENT ON TABLE class_session IS 'A single occurrence of a scheduled class on a specific date.';
COMMENT ON TABLE enrollment IS 'Which students are enrolled in which scheduled class.';
COMMENT ON TABLE attendance IS 'A student''s attendance record for one session.';
COMMENT ON TABLE attendance_audit IS 'Append-only history of every change to an attendance record. Filled by trigger trg_attendance_audit; never written by the application.';

-- keep updated_at current on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';
CREATE TRIGGER trg_role_updated_at BEFORE UPDATE ON role FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_email_parm_updated_at BEFORE UPDATE ON email_parm FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_permission_updated_at BEFORE UPDATE ON user_permission FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_permission_updated_at BEFORE UPDATE ON role_permission FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_academic_period_updated_at BEFORE UPDATE ON academic_period FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_class_updated_at BEFORE UPDATE ON class FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_location_updated_at BEFORE UPDATE ON location FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_beacon_updated_at BEFORE UPDATE ON beacon FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_nfc_tags_updated_at BEFORE UPDATE ON nfc_tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_class_schedule_updated_at BEFORE UPDATE ON class_schedule FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_class_session_updated_at BEFORE UPDATE ON class_session FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_enrollment_updated_at BEFORE UPDATE ON enrollment FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- record every attendance insert and meaningful update in attendance_audit
CREATE OR REPLACE FUNCTION audit_attendance() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.attendance_audit (student_id, session_id, new_status, new_checked_in_at, new_check_in_method, reason, changed_by)
        VALUES (NEW.student_id, NEW.session_id, NEW.status, NEW.checked_in_at, NEW.check_in_method, NEW.comments, NEW.created_by);
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
       OR NEW.check_in_method IS DISTINCT FROM OLD.check_in_method
       OR NEW.comments IS DISTINCT FROM OLD.comments THEN
        INSERT INTO public.attendance_audit (student_id, session_id, old_status, new_status, old_checked_in_at, new_checked_in_at, old_check_in_method, new_check_in_method, reason, changed_by)
        VALUES (NEW.student_id, NEW.session_id, OLD.status, NEW.status, OLD.checked_in_at, NEW.checked_in_at, OLD.check_in_method, NEW.check_in_method, NEW.comments, NEW.updated_by);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION audit_attendance() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_attendance_audit AFTER INSERT OR UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION audit_attendance();

-- history rows can never be changed or removed
CREATE OR REPLACE FUNCTION prevent_audit_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'attendance_audit is append-only';
END;
$$ LANGUAGE plpgsql SET search_path = '';
CREATE TRIGGER trg_attendance_audit_immutable BEFORE UPDATE OR DELETE ON attendance_audit FOR EACH ROW EXECUTE FUNCTION prevent_audit_change();

-- keep the exclusion-constraint extension out of the exposed public schema
ALTER EXTENSION btree_gist SET SCHEMA extensions;

-- indexes for foreign keys not already covered by a primary key or unique constraint
CREATE INDEX ix_users_email_parm_id ON users (email_parm_id);
CREATE INDEX ix_users_role_id ON users (role_id);
CREATE INDEX ix_user_permission_permission_id ON user_permission (permission_id);
CREATE INDEX ix_role_permission_permission_id ON role_permission (permission_id);
CREATE INDEX ix_beacon_location_id ON beacon (location_id);
CREATE INDEX ix_nfc_tags_location_id ON nfc_tags (location_id);
CREATE INDEX ix_class_schedule_class_id ON class_schedule (class_id);
CREATE INDEX ix_class_schedule_academic_period_id ON class_schedule (academic_period_id);
CREATE INDEX ix_class_schedule_frequency_id ON class_schedule (frequency_id);
CREATE INDEX ix_class_schedule_lecturer_id ON class_schedule (lecturer_id);
CREATE INDEX ix_class_schedule_location_id ON class_schedule (location_id);
CREATE INDEX ix_class_session_override_location_id ON class_session (override_location_id);
CREATE INDEX ix_class_session_session_date ON class_session (session_date);
CREATE INDEX ix_enrollment_class_schedule_id ON enrollment (class_schedule_id);
CREATE INDEX ix_attendance_session_id ON attendance (session_id);
CREATE INDEX ix_attendance_audit_changed_by ON attendance_audit (changed_by);
