-- HVAC AI Secretary - CRM Database Schema
-- PostgreSQL optimized for performance and scalability

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    
    -- Basic Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    
    -- Service Address
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    
    -- Property Details
    property_type VARCHAR(50), -- 'residential', 'commercial'
    is_homeowner BOOLEAN DEFAULT true,
    
    -- Acquisition Tracking
    source VARCHAR(100), -- 'google', 'referral', 'facebook', 'yard_sign', etc.
    referred_by VARCHAR(255),
    
    -- Status
    customer_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'blocked'
    vip_status BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact_date TIMESTAMP,
    
    -- Notes
    notes TEXT,
    
    -- Indexes for fast lookup
    CONSTRAINT unique_phone UNIQUE(phone)
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_zip ON customers(zip_code);
CREATE INDEX idx_customers_status ON customers(customer_status);

-- ============================================================================
-- CALL LOGS TABLE
-- ============================================================================
CREATE TABLE call_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    
    -- Call Details
    call_direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    caller_phone VARCHAR(20) NOT NULL,
    call_duration_seconds INTEGER,
    
    -- AI Detection
    detected_intent VARCHAR(50), -- 'emergency', 'booking', 'question', 'existing_customer'
    intent_confidence DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Call Outcome
    call_status VARCHAR(50), -- 'completed', 'abandoned', 'transferred', 'voicemail'
    appointment_booked BOOLEAN DEFAULT false,
    transferred_to_human BOOLEAN DEFAULT false,
    
    -- Recording & Transcript
    recording_url VARCHAR(500),
    transcript TEXT,
    ai_summary TEXT,
    
    -- Sentiment Analysis
    customer_sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative', 'frustrated'
    
    -- Metadata
    call_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Cost Tracking
    cost_per_minute DECIMAL(5,3),
    total_call_cost DECIMAL(8,2)
);

CREATE INDEX idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX idx_call_logs_timestamp ON call_logs(call_timestamp);
CREATE INDEX idx_call_logs_intent ON call_logs(detected_intent);
CREATE INDEX idx_call_logs_phone ON call_logs(caller_phone);

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    
    -- Appointment Details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_end_time TIME,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Service Information
    service_type VARCHAR(100) NOT NULL, -- 'maintenance', 'repair', 'installation', 'emergency'
    service_description TEXT,
    priority_level VARCHAR(20) DEFAULT 'normal', -- 'emergency', 'high', 'normal', 'low'
    
    -- Assignment
    assigned_technician_id INTEGER,
    technician_name VARCHAR(100),
    
    -- Status Tracking
    appointment_status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
    confirmed_by_customer BOOLEAN DEFAULT false,
    confirmation_sent_at TIMESTAMP,
    
    -- Location
    service_address VARCHAR(500),
    
    -- Notifications
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    on_way_notification_sent BOOLEAN DEFAULT false,
    
    -- Source
    booked_via VARCHAR(50), -- 'ai_call', 'web_form', 'manual', 'chat_widget'
    related_call_log_id INTEGER REFERENCES call_logs(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Job Outcome (filled after completion)
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    work_completed TEXT,
    invoice_amount DECIMAL(10,2),
    payment_status VARCHAR(50) -- 'pending', 'paid', 'overdue'
);

CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(appointment_status);
CREATE INDEX idx_appointments_tech ON appointments(assigned_technician_id);
CREATE INDEX idx_appointments_priority ON appointments(priority_level);

-- ============================================================================
-- EQUIPMENT/SYSTEMS TABLE
-- ============================================================================
CREATE TABLE customer_equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    
    -- Equipment Details
    equipment_type VARCHAR(100) NOT NULL, -- 'ac_unit', 'furnace', 'heat_pump', 'thermostat', 'ductwork'
    brand VARCHAR(100),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Installation Info
    installation_date DATE,
    warranty_expiration DATE,
    
    -- System Specs
    capacity VARCHAR(50), -- '3-ton', '4-ton', etc.
    fuel_type VARCHAR(50), -- 'electric', 'gas', 'oil', 'propane'
    
    -- Location
    equipment_location VARCHAR(255), -- 'basement', 'attic', 'outside unit', etc.
    
    -- Status
    equipment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'replaced', 'removed'
    last_service_date DATE,
    next_service_due DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_equipment_customer ON customer_equipment(customer_id);
CREATE INDEX idx_equipment_type ON customer_equipment(equipment_type);
CREATE INDEX idx_equipment_service_due ON customer_equipment(next_service_due);

-- ============================================================================
-- SERVICE HISTORY TABLE
-- ============================================================================
CREATE TABLE service_history (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    appointment_id INTEGER REFERENCES appointments(id),
    equipment_id INTEGER REFERENCES customer_equipment(id),
    
    -- Service Details
    service_date DATE NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    technician_name VARCHAR(100),
    
    -- Work Performed
    work_description TEXT NOT NULL,
    parts_used TEXT,
    labor_hours DECIMAL(4,2),
    
    -- Pricing
    parts_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2) NOT NULL,
    
    -- Photos/Documentation
    photo_urls TEXT[], -- Array of photo URLs
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_history_customer ON service_history(customer_id);
CREATE INDEX idx_service_history_date ON service_history(service_date);
CREATE INDEX idx_service_history_appointment ON service_history(appointment_id);

-- ============================================================================
-- SMS/NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    appointment_id INTEGER REFERENCES appointments(id),
    
    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- 'appointment_confirmation', 'reminder', 'tech_on_way', 'payment_reminder', 'follow_up'
    channel VARCHAR(20) NOT NULL, -- 'sms', 'email', 'both'
    
    -- Content
    subject VARCHAR(255),
    message_body TEXT NOT NULL,
    
    -- Recipient
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(255),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Twilio Details
    twilio_message_sid VARCHAR(100),
    error_message TEXT,
    
    -- Cost
    cost DECIMAL(6,4),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_customer ON notifications(customer_id);
CREATE INDEX idx_notifications_appointment ON notifications(appointment_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- ============================================================================
-- TECHNICIANS TABLE
-- ============================================================================
CREATE TABLE technicians (
    id SERIAL PRIMARY KEY,
    
    -- Basic Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    
    -- Employment
    employee_id VARCHAR(50),
    hire_date DATE,
    employment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'on_leave'
    
    -- Skills & Certifications
    certifications TEXT[],
    specialties TEXT[], -- 'hvac', 'plumbing', 'electrical', etc.
    
    -- Scheduling
    default_schedule JSONB, -- {monday: {start: '08:00', end: '17:00'}, ...}
    on_call_rotation BOOLEAN DEFAULT false,
    
    -- Performance
    jobs_completed INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_technicians_status ON technicians(employment_status);

-- ============================================================================
-- BUSINESS SETTINGS TABLE
-- ============================================================================
CREATE TABLE business_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed with common settings
INSERT INTO business_settings (setting_key, setting_value, setting_type, description) VALUES
('business_name', 'Cool Comfort HVAC', 'string', 'Business name for AI greeting'),
('business_phone', '555-123-4567', 'string', 'Main business phone number'),
('service_area_zips', '["78701", "78702", "78703", "78704", "78705"]', 'json', 'Service area zip codes'),
('business_hours', '{"monday": {"open": "08:00", "close": "17:00"}}', 'json', 'Regular business hours'),
('service_call_fee', '89.00', 'number', 'Standard service call fee'),
('emergency_surcharge', '50.00', 'number', 'Emergency after-hours surcharge'),
('ai_assistant_name', 'Riley', 'string', 'AI voice assistant name'),
('emergency_response_time', '15', 'number', 'Minutes to respond to emergencies');

-- ============================================================================
-- ANALYTICS/METRICS VIEW
-- ============================================================================
CREATE VIEW daily_metrics AS
SELECT 
    DATE(call_timestamp) as metric_date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN appointment_booked = true THEN 1 END) as appointments_booked,
    COUNT(CASE WHEN detected_intent = 'emergency' THEN 1 END) as emergency_calls,
    COUNT(CASE WHEN transferred_to_human = true THEN 1 END) as human_transfers,
    AVG(call_duration_seconds) as avg_call_duration,
    SUM(total_call_cost) as total_call_costs,
    ROUND(
        CAST(COUNT(CASE WHEN appointment_booked = true THEN 1 END) AS DECIMAL) / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as booking_conversion_rate
FROM call_logs
GROUP BY DATE(call_timestamp)
ORDER BY metric_date DESC;

-- ============================================================================
-- CUSTOMER LIFETIME VALUE VIEW
-- ============================================================================
CREATE VIEW customer_lifetime_value AS
SELECT 
    c.id as customer_id,
    c.first_name,
    c.last_name,
    c.phone,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT sh.id) as total_services,
    COALESCE(SUM(sh.total_cost), 0) as lifetime_value,
    MAX(a.appointment_date) as last_service_date,
    c.created_at as customer_since
FROM customers c
LEFT JOIN appointments a ON c.id = a.customer_id
LEFT JOIN service_history sh ON c.id = sh.customer_id
GROUP BY c.id, c.first_name, c.last_name, c.phone, c.created_at
ORDER BY lifetime_value DESC;

-- ============================================================================
-- UPCOMING APPOINTMENTS VIEW
-- ============================================================================
CREATE VIEW upcoming_appointments AS
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    c.first_name || ' ' || c.last_name as customer_name,
    c.phone as customer_phone,
    a.service_type,
    a.service_description,
    a.assigned_technician_id,
    a.technician_name,
    a.appointment_status,
    a.priority_level,
    a.reminder_sent,
    CASE 
        WHEN a.appointment_date = CURRENT_DATE THEN 'today'
        WHEN a.appointment_date = CURRENT_DATE + INTERVAL '1 day' THEN 'tomorrow'
        ELSE 'upcoming'
    END as time_category
FROM appointments a
JOIN customers c ON a.customer_id = c.id
WHERE a.appointment_status IN ('scheduled', 'confirmed')
  AND a.appointment_date >= CURRENT_DATE
ORDER BY a.appointment_date, a.appointment_time;

-- ============================================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Update customer.updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update customer.last_contact_date on new call
CREATE OR REPLACE FUNCTION update_customer_last_contact()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers 
    SET last_contact_date = NEW.call_timestamp
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_last_contact_on_call AFTER INSERT ON call_logs
    FOR EACH ROW EXECUTE FUNCTION update_customer_last_contact();

-- ============================================================================
-- SAMPLE QUERIES FOR COMMON OPERATIONS
-- ============================================================================

-- Find customer by phone number
-- SELECT * FROM customers WHERE phone = '512-555-1234';

-- Get customer's appointment history
-- SELECT * FROM appointments WHERE customer_id = 1 ORDER BY appointment_date DESC;

-- Today's schedule for a technician
-- SELECT * FROM upcoming_appointments WHERE technician_name = 'John Smith' AND time_category = 'today';

-- Customers due for maintenance (90 days since last service)
-- SELECT c.*, MAX(a.appointment_date) as last_service
-- FROM customers c
-- JOIN appointments a ON c.id = a.customer_id
-- WHERE a.service_type = 'maintenance'
-- GROUP BY c.id
-- HAVING MAX(a.appointment_date) < CURRENT_DATE - INTERVAL '90 days';

-- Emergency calls in last 24 hours
-- SELECT * FROM call_logs 
-- WHERE detected_intent = 'emergency' 
--   AND call_timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Conversion rate by source
-- SELECT 
--     source,
--     COUNT(*) as total_customers,
--     SUM(CASE WHEN customer_status = 'active' THEN 1 ELSE 0 END) as active_customers
-- FROM customers
-- GROUP BY source;
