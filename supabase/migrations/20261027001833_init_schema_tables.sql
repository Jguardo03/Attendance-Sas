CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE modifier_type AS ENUM ('grant', 'deny');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE check_in_method AS ENUM ('beacon', 'nfc', 'qr', 'manual');
CREATE TYPE session_status AS ENUM ('scheduled', 'started', 'finished', 'rescheduled', 'cancelled');
CREATE TYPE academic_period_status AS ENUM ('planning', 'active', 'finished');

CREATE TABLE role (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_role PRIMARY KEY (id),
    CONSTRAINT uq_role_name UNIQUE (name)
);

CREATE TABLE permissions (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_permissions PRIMARY KEY (id),
    CONSTRAINT uq_permissions_name UNIQUE (name)
);

CREATE TABLE email_parm (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    institution VARCHAR(150) NOT NULL,
    format VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_email_parm PRIMARY KEY (id),
    CONSTRAINT uq_email_parm_format UNIQUE (format)
);

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

CREATE TABLE frequency (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(50) NOT NULL,
    interval_days INTEGER NOT NULL,
    CONSTRAINT pk_frequency PRIMARY KEY (id),
    CONSTRAINT uq_frequency_name UNIQUE (name),
    CONSTRAINT chk_frequency_interval_days CHECK (interval_days > 0)
);

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

CREATE TABLE class (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT pk_class PRIMARY KEY (id),
    CONSTRAINT uq_class_name UNIQUE (name)
);

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
