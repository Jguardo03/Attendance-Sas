-- PostgreSQL schema generated from the data dictionary
-- Logical schema only (tables, constraints, indexes, audit triggers). Row Level Security, grants, the permission
-- catalogue, the access-token hook and the derived-data functions live in the Supabase migrations (see
-- supabase/migrations/README.md). Deployed differences from the first draft: btree_gist is installed in the
-- "extensions" schema, trigger functions pin search_path, and foreign keys have supporting indexes (end of file).
BEGIN;

-- Needed for the overlap (EXCLUDE) constraints on class_schedule
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TYPE modifier_type AS ENUM ('grant', 'deny');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE check_in_method AS ENUM ('beacon', 'nfc', 'qr', 'manual');
CREATE TYPE session_status AS ENUM ('scheduled', 'started', 'finished', 'rescheduled', 'cancelled');
CREATE TYPE academic_period_status AS ENUM ('planning', 'active', 'finished');

-- User roles, e.g. student, lecturer, accounting, marketing.
CREATE TABLE role (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_role PRIMARY KEY (id),
    CONSTRAINT uq_role_name UNIQUE (name)
);

-- Catalogue of actions a user can be allowed to perform.
CREATE TABLE permissions (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_permissions PRIMARY KEY (id),
    CONSTRAINT uq_permissions_name UNIQUE (name)
);

-- Allowed institutional email formats used to validate user emails.
CREATE TABLE email_parm (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    institution VARCHAR(150) NOT NULL,
    format VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_email_parm PRIMARY KEY (id),
    CONSTRAINT uq_email_parm_format UNIQUE (format)
);

-- Everyone who uses the system. Login is passwordless through Supabase Auth (auth.users).
CREATE TABLE users (
    id VARCHAR(8) NOT NULL,
    auth_user_id UUID NOT NULL,
    email_parm_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT chk_users_id CHECK (id ~ '^[SLA][0-9]{1,7}$'),
    CONSTRAINT uq_users_auth_user_id UNIQUE (auth_user_id),
    CONSTRAINT fk_users_auth_user_id FOREIGN KEY (auth_user_id) REFERENCES auth.users (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_users_email_parm_id FOREIGN KEY (email_parm_id) REFERENCES email_parm (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES role (id) ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));

-- Per-user permission overrides that grant or deny on top of the role.
CREATE TABLE user_permission (
    user_id VARCHAR(8) NOT NULL,
    permission_id INTEGER NOT NULL,
    modifier_type modifier_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by VARCHAR(8),
    updated_by VARCHAR(8),
    CONSTRAINT fk_user_permission_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_permission_permission_id FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT fk_user_permission_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_user_permission_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT pk_user_permission PRIMARY KEY (user_id, permission_id)
);

-- Permissions every user with a role receives.
CREATE TABLE role_permission (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by VARCHAR(8),
    updated_by VARCHAR(8),
    CONSTRAINT fk_role_permission_role_id FOREIGN KEY (role_id) REFERENCES role (id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT fk_role_permission_permission_id FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT fk_role_permission_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_role_permission_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT pk_role_permission PRIMARY KEY (role_id, permission_id)
);

-- How often a scheduled class repeats.
CREATE TABLE frequency (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(50) NOT NULL,
    interval_days INTEGER NOT NULL,
    CONSTRAINT pk_frequency PRIMARY KEY (id),
    CONSTRAINT uq_frequency_name UNIQUE (name),
    CONSTRAINT chk_frequency_interval_days CHECK (interval_days > 0)
);

-- Terms or semesters that schedules belong to.
CREATE TABLE academic_period (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    finish_date DATE NOT NULL,
    status academic_period_status DEFAULT 'planning' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_academic_period PRIMARY KEY (id),
    CONSTRAINT uq_academic_period_name UNIQUE (name),
    CONSTRAINT chk_academic_period_dates CHECK (finish_date > start_date)
);

-- Subjects or units offered.
CREATE TABLE class (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_class PRIMARY KEY (id),
    CONSTRAINT uq_class_name UNIQUE (name)
);

-- Rooms or spaces where classes take place.
CREATE TABLE location (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(100) NOT NULL,
    qr_secret_seed BYTEA,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_location PRIMARY KEY (id),
    CONSTRAINT uq_location_name UNIQUE (name),
    CONSTRAINT uq_location_qr_secret_seed UNIQUE (qr_secret_seed),
    CONSTRAINT chk_location_qr_secret_seed CHECK (octet_length(qr_secret_seed) BETWEEN 16 AND 64)
);

-- Bluetooth (iBeacon) devices used to confirm a student is in the room.
CREATE TABLE beacon (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    location_id INTEGER,
    uuid UUID NOT NULL,
    major INTEGER NOT NULL,
    minor INTEGER NOT NULL,
    rssi_calibrated SMALLINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_beacon PRIMARY KEY (id),
    CONSTRAINT chk_beacon_major CHECK (major BETWEEN 0 AND 65535),
    CONSTRAINT chk_beacon_minor CHECK (minor BETWEEN 0 AND 65535),
    CONSTRAINT chk_beacon_rssi_calibrated CHECK (rssi_calibrated BETWEEN -127 AND 0),
    CONSTRAINT fk_beacon_location_id FOREIGN KEY (location_id) REFERENCES location (id) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT uq_beacon_identity UNIQUE (uuid, major, minor)
);

-- NFC tags placed in locations that students tap to check in.
CREATE TABLE nfc_tags (
    nfc_uid VARCHAR(20) NOT NULL,
    location_id INTEGER,
    payload_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_nfc_tags PRIMARY KEY (nfc_uid),
    CONSTRAINT uq_nfc_tags_payload_token UNIQUE (payload_token),
    CONSTRAINT chk_nfc_tags_nfc_uid CHECK (nfc_uid ~ '^[0-9A-F]{8}([0-9A-F]{6}){0,2}$'),
    CONSTRAINT fk_nfc_tags_location_id FOREIGN KEY (location_id) REFERENCES location (id) ON DELETE SET NULL ON UPDATE NO ACTION
);

-- Recurring timetable slot for a class in a period.
CREATE TABLE class_schedule (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    class_id INTEGER NOT NULL,
    academic_period_id INTEGER NOT NULL,
    frequency_id INTEGER NOT NULL,
    lecturer_id VARCHAR(8) NOT NULL,
    location_id INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    week_day SMALLINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by VARCHAR(8),
    updated_by VARCHAR(8),
    CONSTRAINT pk_class_schedule PRIMARY KEY (id),
    CONSTRAINT chk_class_schedule_week_day CHECK (week_day BETWEEN 1 AND 7),
    CONSTRAINT fk_class_schedule_class_id FOREIGN KEY (class_id) REFERENCES class (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_class_schedule_academic_period_id FOREIGN KEY (academic_period_id) REFERENCES academic_period (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_class_schedule_frequency_id FOREIGN KEY (frequency_id) REFERENCES frequency (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_class_schedule_lecturer_id FOREIGN KEY (lecturer_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_class_schedule_location_id FOREIGN KEY (location_id) REFERENCES location (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_class_schedule_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_class_schedule_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_schedule_location_slot EXCLUDE USING gist (location_id WITH =, academic_period_id WITH =, week_day WITH =, tsrange('2000-01-01'::date + start_time, '2000-01-01'::date + end_time) WITH &&),
    CONSTRAINT uq_schedule_lecturer_slot EXCLUDE USING gist (lecturer_id WITH =, academic_period_id WITH =, week_day WITH =, tsrange('2000-01-01'::date + start_time, '2000-01-01'::date + end_time) WITH &&),
    CONSTRAINT chk_schedule_times CHECK (end_time > start_time)
);

-- A single occurrence of a scheduled class on a specific date.
CREATE TABLE class_session (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    class_schedule_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    status session_status DEFAULT 'scheduled' NOT NULL,
    override_start_time TIME,
    override_end_time TIME,
    override_location_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by VARCHAR(8),
    updated_by VARCHAR(8),
    CONSTRAINT pk_class_session PRIMARY KEY (id),
    CONSTRAINT fk_class_session_class_schedule_id FOREIGN KEY (class_schedule_id) REFERENCES class_schedule (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_class_session_override_location_id FOREIGN KEY (override_location_id) REFERENCES location (id) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT fk_class_session_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_class_session_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_session_schedule_date UNIQUE (class_schedule_id, session_date),
    CONSTRAINT chk_session_override_times CHECK (override_start_time IS NULL OR override_end_time IS NULL OR override_end_time > override_start_time)
);

-- Which students are enrolled in which scheduled class.
CREATE TABLE enrollment (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    user_id VARCHAR(8) NOT NULL,
    class_schedule_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by VARCHAR(8),
    updated_by VARCHAR(8),
    CONSTRAINT pk_enrollment PRIMARY KEY (id),
    CONSTRAINT fk_enrollment_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_enrollment_class_schedule_id FOREIGN KEY (class_schedule_id) REFERENCES class_schedule (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_enrollment_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_enrollment_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_enrollment_user_schedule UNIQUE (user_id, class_schedule_id)
);

-- A student's attendance record for one session.
CREATE TABLE attendance (
    student_id VARCHAR(8) NOT NULL,
    session_id INTEGER NOT NULL,
    status attendance_status NOT NULL,
    checked_in_at TIMESTAMPTZ,
    check_in_method check_in_method,
    comments VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by VARCHAR(8),
    updated_by VARCHAR(8),
    CONSTRAINT fk_attendance_student_id FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_attendance_session_id FOREIGN KEY (session_id) REFERENCES class_session (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_attendance_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_attendance_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT pk_attendance PRIMARY KEY (student_id, session_id),
    CONSTRAINT chk_attendance_check_in CHECK ((status = 'absent' AND checked_in_at IS NULL AND check_in_method IS NULL) OR (status <> 'absent' AND checked_in_at IS NOT NULL AND check_in_method IS NOT NULL))
);

-- Append-only history of every change to an attendance record. Filled by trigger trg_attendance_audit.
CREATE TABLE attendance_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    student_id VARCHAR(8) NOT NULL,
    session_id INTEGER NOT NULL,
    old_status attendance_status,
    new_status attendance_status NOT NULL,
    old_checked_in_at TIMESTAMPTZ,
    new_checked_in_at TIMESTAMPTZ,
    old_check_in_method check_in_method,
    new_check_in_method check_in_method,
    reason VARCHAR(500),
    changed_by VARCHAR(8),
    changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_attendance_audit PRIMARY KEY (id),
    CONSTRAINT fk_attendance_audit_attendance FOREIGN KEY (student_id, session_id) REFERENCES attendance (student_id, session_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_attendance_audit_changed_by FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX ix_attendance_audit_record ON attendance_audit (student_id, session_id, changed_at);

COMMENT ON TABLE role IS 'User roles, e.g. student, lecturer, accounting, marketing.';
COMMENT ON COLUMN role.id IS 'Unique identifier of the role.';
COMMENT ON COLUMN role.name IS 'Role name, e.g. student, lecturer, accounting, marketing.';
COMMENT ON COLUMN role.description IS 'What the role is for.';
COMMENT ON COLUMN role.created_at IS 'When the row was created.';
COMMENT ON COLUMN role.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE permissions IS 'Catalogue of actions a user can be allowed to perform.';
COMMENT ON COLUMN permissions.id IS 'Unique identifier of the permission.';
COMMENT ON COLUMN permissions.name IS 'Permission key, e.g. attendance.edit.';
COMMENT ON COLUMN permissions.description IS 'What the permission allows.';
COMMENT ON COLUMN permissions.created_at IS 'When the row was created.';
COMMENT ON COLUMN permissions.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE email_parm IS 'Allowed institutional email formats used to validate user emails.';
COMMENT ON COLUMN email_parm.id IS 'Unique identifier of the email parameter.';
COMMENT ON COLUMN email_parm.institution IS 'Name of the institution the format belongs to.';
COMMENT ON COLUMN email_parm.format IS 'Email domain or pattern, e.g. @student.ait.edu.au.';
COMMENT ON COLUMN email_parm.created_at IS 'When the row was created.';
COMMENT ON COLUMN email_parm.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE users IS 'Everyone who uses the system. Login is passwordless through Supabase Auth (auth.users).';
COMMENT ON COLUMN users.id IS 'Institutional ID: S = student, L = lecturer, A = administrative staff, followed by up to 7 digits (e.g. S1234567).';
COMMENT ON COLUMN users.auth_user_id IS 'Supabase Auth identity (auth.users.id) used to sign in. One-to-one. Created by the admin-create-user Edge Function together with this row.';
COMMENT ON COLUMN users.email_parm_id IS 'Email format the user''s address belongs to.';
COMMENT ON COLUMN users.role_id IS 'Role assigned to the user.';
COMMENT ON COLUMN users.last_name IS 'User''s last name.';
COMMENT ON COLUMN users.first_name IS 'User''s first name.';
COMMENT ON COLUMN users.email IS 'Login email. Unique ignoring case via index on LOWER(email).';
COMMENT ON COLUMN users.created_at IS 'When the row was created.';
COMMENT ON COLUMN users.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE user_permission IS 'Per-user permission overrides that grant or deny on top of the role.';
COMMENT ON COLUMN user_permission.user_id IS 'User the override applies to.';
COMMENT ON COLUMN user_permission.permission_id IS 'Permission being granted or denied.';
COMMENT ON COLUMN user_permission.modifier_type IS 'grant = add permission, deny = remove it even if the role has it.';
COMMENT ON COLUMN user_permission.created_at IS 'When the row was created.';
COMMENT ON COLUMN user_permission.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON COLUMN user_permission.created_by IS 'User who created the row. NULL for system-generated rows (e.g. automatic check-ins).';
COMMENT ON COLUMN user_permission.updated_by IS 'User who last changed the row. Set by the application.';
COMMENT ON TABLE role_permission IS 'Permissions every user with a role receives.';
COMMENT ON COLUMN role_permission.role_id IS 'Role receiving the permission.';
COMMENT ON COLUMN role_permission.permission_id IS 'Permission given to the role.';
COMMENT ON COLUMN role_permission.created_at IS 'When the row was created.';
COMMENT ON COLUMN role_permission.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON COLUMN role_permission.created_by IS 'User who created the row. NULL for system-generated rows (e.g. automatic check-ins).';
COMMENT ON COLUMN role_permission.updated_by IS 'User who last changed the row. Set by the application.';
COMMENT ON TABLE frequency IS 'How often a scheduled class repeats.';
COMMENT ON COLUMN frequency.id IS 'Unique identifier of the frequency.';
COMMENT ON COLUMN frequency.name IS 'Label, e.g. weekly, fortnightly.';
COMMENT ON COLUMN frequency.interval_days IS 'Days between occurrences, e.g. 7 or 14.';
COMMENT ON TABLE academic_period IS 'Terms or semesters that schedules belong to.';
COMMENT ON COLUMN academic_period.id IS 'Unique identifier of the period.';
COMMENT ON COLUMN academic_period.name IS 'Period name, e.g. 2026 Term 4.';
COMMENT ON COLUMN academic_period.start_date IS 'First day of the period.';
COMMENT ON COLUMN academic_period.finish_date IS 'Last day of the period. Must be after start_date.';
COMMENT ON COLUMN academic_period.status IS 'planning, active or finished.';
COMMENT ON COLUMN academic_period.created_at IS 'When the row was created.';
COMMENT ON COLUMN academic_period.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE class IS 'Subjects or units offered.';
COMMENT ON COLUMN class.id IS 'Unique identifier of the class.';
COMMENT ON COLUMN class.name IS 'Class name.';
COMMENT ON COLUMN class.description IS 'Class description.';
COMMENT ON COLUMN class.created_at IS 'When the row was created.';
COMMENT ON COLUMN class.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE location IS 'Rooms or spaces where classes take place.';
COMMENT ON COLUMN location.id IS 'Unique identifier of the location.';
COMMENT ON COLUMN location.name IS 'Location name, e.g. Room 3.02.';
COMMENT ON COLUMN location.qr_secret_seed IS 'Secret seed used to generate the location''s rotating QR code. Stored as raw bytes; shown as hex in the app (encode(qr_secret_seed, ''hex'')). NULL = location has no QR check-in.';
COMMENT ON COLUMN location.created_at IS 'When the row was created.';
COMMENT ON COLUMN location.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE beacon IS 'Bluetooth (iBeacon) devices used to confirm a student is in the room.';
COMMENT ON COLUMN beacon.id IS 'Unique identifier of the beacon.';
COMMENT ON COLUMN beacon.location_id IS 'Location the beacon is installed in. NULL when not assigned.';
COMMENT ON COLUMN beacon.uuid IS 'iBeacon proximity UUID.';
COMMENT ON COLUMN beacon.major IS 'iBeacon major value (0 to 65535).';
COMMENT ON COLUMN beacon.minor IS 'iBeacon minor value (0 to 65535).';
COMMENT ON COLUMN beacon.rssi_calibrated IS 'Measured power in dBm at 1 metre (usually around -59), used to estimate distance.';
COMMENT ON COLUMN beacon.created_at IS 'When the row was created.';
COMMENT ON COLUMN beacon.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE nfc_tags IS 'NFC tags placed in locations that students tap to check in.';
COMMENT ON COLUMN nfc_tags.nfc_uid IS 'Hardware UID of the tag as uppercase hex: 4, 7 or 10 bytes (8, 14 or 20 hex characters).';
COMMENT ON COLUMN nfc_tags.location_id IS 'Location the tag is installed in. NULL when not assigned.';
COMMENT ON COLUMN nfc_tags.payload_token IS 'Token written to the tag and validated by the server on tap.';
COMMENT ON COLUMN nfc_tags.created_at IS 'When the row was created.';
COMMENT ON COLUMN nfc_tags.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON TABLE class_schedule IS 'Recurring timetable slot for a class in a period.';
COMMENT ON COLUMN class_schedule.id IS 'Unique identifier of the schedule.';
COMMENT ON COLUMN class_schedule.class_id IS 'Class being taught.';
COMMENT ON COLUMN class_schedule.academic_period_id IS 'Period the schedule runs in.';
COMMENT ON COLUMN class_schedule.frequency_id IS 'How often the class repeats.';
COMMENT ON COLUMN class_schedule.lecturer_id IS 'Lecturer teaching the class (user with L prefix).';
COMMENT ON COLUMN class_schedule.location_id IS 'Default location of the class.';
COMMENT ON COLUMN class_schedule.start_time IS 'Start time of the class.';
COMMENT ON COLUMN class_schedule.end_time IS 'End time. Must be after start_time.';
COMMENT ON COLUMN class_schedule.week_day IS 'ISO day of week: 1 = Monday ... 7 = Sunday. Matches EXTRACT(ISODOW FROM date).';
COMMENT ON COLUMN class_schedule.created_at IS 'When the row was created.';
COMMENT ON COLUMN class_schedule.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON COLUMN class_schedule.created_by IS 'User who created the row. NULL for system-generated rows (e.g. automatic check-ins).';
COMMENT ON COLUMN class_schedule.updated_by IS 'User who last changed the row. Set by the application.';
COMMENT ON TABLE class_session IS 'A single occurrence of a scheduled class on a specific date.';
COMMENT ON COLUMN class_session.id IS 'Unique identifier of the session.';
COMMENT ON COLUMN class_session.class_schedule_id IS 'Schedule this session belongs to.';
COMMENT ON COLUMN class_session.session_date IS 'Date of the session.';
COMMENT ON COLUMN class_session.status IS 'scheduled, started, finished, rescheduled or cancelled.';
COMMENT ON COLUMN class_session.override_start_time IS 'Replaces the schedule start time for this session only.';
COMMENT ON COLUMN class_session.override_end_time IS 'Replaces the schedule end time for this session only.';
COMMENT ON COLUMN class_session.override_location_id IS 'Replaces the schedule location for this session only. NULL = use schedule location.';
COMMENT ON COLUMN class_session.created_at IS 'When the row was created.';
COMMENT ON COLUMN class_session.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON COLUMN class_session.created_by IS 'User who created the row. NULL for system-generated rows (e.g. automatic check-ins).';
COMMENT ON COLUMN class_session.updated_by IS 'User who last changed the row. Set by the application.';
COMMENT ON TABLE enrollment IS 'Which students are enrolled in which scheduled class.';
COMMENT ON COLUMN enrollment.id IS 'Unique identifier of the enrollment.';
COMMENT ON COLUMN enrollment.user_id IS 'Enrolled student.';
COMMENT ON COLUMN enrollment.class_schedule_id IS 'Schedule the student is enrolled in.';
COMMENT ON COLUMN enrollment.created_at IS 'When the row was created.';
COMMENT ON COLUMN enrollment.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON COLUMN enrollment.created_by IS 'User who created the row. NULL for system-generated rows (e.g. automatic check-ins).';
COMMENT ON COLUMN enrollment.updated_by IS 'User who last changed the row. Set by the application.';
COMMENT ON TABLE attendance IS 'A student''s attendance record for one session.';
COMMENT ON COLUMN attendance.student_id IS 'Student the record belongs to.';
COMMENT ON COLUMN attendance.session_id IS 'Session attended.';
COMMENT ON COLUMN attendance.status IS 'present, absent or late.';
COMMENT ON COLUMN attendance.checked_in_at IS 'When the student checked in. NULL when absent.';
COMMENT ON COLUMN attendance.check_in_method IS 'How the check-in was made: beacon, nfc, qr or manual. NULL when absent.';
COMMENT ON COLUMN attendance.comments IS 'Notes, e.g. reason for absence.';
COMMENT ON COLUMN attendance.created_at IS 'When the row was created.';
COMMENT ON COLUMN attendance.updated_at IS 'When the row was last changed. Set automatically by trigger trg_<table>_updated_at.';
COMMENT ON COLUMN attendance.created_by IS 'User who created the row. NULL for system-generated rows (e.g. automatic check-ins).';
COMMENT ON COLUMN attendance.updated_by IS 'User who last changed the row. Set by the application.';
COMMENT ON TABLE attendance_audit IS 'Append-only history of every change to an attendance record. Filled by trigger trg_attendance_audit; never written by the application.';
COMMENT ON COLUMN attendance_audit.id IS 'Unique identifier of the history entry.';
COMMENT ON COLUMN attendance_audit.student_id IS 'Student of the attendance record that changed.';
COMMENT ON COLUMN attendance_audit.session_id IS 'Session of the attendance record that changed.';
COMMENT ON COLUMN attendance_audit.old_status IS 'Status before the change. NULL when the record was just created.';
COMMENT ON COLUMN attendance_audit.new_status IS 'Status after the change.';
COMMENT ON COLUMN attendance_audit.old_checked_in_at IS 'Check-in time before the change. NULL when created or absent.';
COMMENT ON COLUMN attendance_audit.new_checked_in_at IS 'Check-in time after the change. NULL when absent.';
COMMENT ON COLUMN attendance_audit.old_check_in_method IS 'Check-in method before the change. NULL when created or absent.';
COMMENT ON COLUMN attendance_audit.new_check_in_method IS 'Check-in method after the change. NULL when absent.';
COMMENT ON COLUMN attendance_audit.reason IS 'Reason given for the change (copied from attendance.comments at the time).';
COMMENT ON COLUMN attendance_audit.changed_by IS 'User who made the change (attendance.updated_by, or created_by on insert). NULL for system-generated rows (e.g. absent job).';
COMMENT ON COLUMN attendance_audit.changed_at IS 'When the change was made.';

-- Audit: keep updated_at current on every UPDATE
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

-- Audit: record every attendance insert and meaningful update in attendance_audit
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

-- Audit: history rows can never be changed or removed
CREATE OR REPLACE FUNCTION prevent_audit_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'attendance_audit is append-only';
END;
$$ LANGUAGE plpgsql SET search_path = '';
CREATE TRIGGER trg_attendance_audit_immutable BEFORE UPDATE OR DELETE ON attendance_audit FOR EACH ROW EXECUTE FUNCTION prevent_audit_change();

-- Indexes for foreign keys not already covered by a primary key or unique constraint
-- (created_by / updated_by audit columns are intentionally not indexed)
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

COMMIT;
