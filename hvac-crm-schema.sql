-- HVAC AI Secretary - CRM Database Schema
-- PostgreSQL optimized for performance and scalability

-- ========================================================================
-- CUSTOMERS TABLE
-- ========================================================================
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

-- ========================================================================
-- CALL LOGS TABLE
-- ========================================================================
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

-- ========================================================================
-- SERVICE TYPES TABLE
-- ========================================================================
CREATE TABLE service_types (
    id SERIAL PRIMARY KEY,
    
    -- Service Definition
    service_name VARCHAR(100) NOT NULL UNIQUE,
    service_category VARCHAR(50), -- 'repair', 'maintenance', 'installation', 'emergency'
    
    -- Pricing
    base_price DECIMAL(10,2),
    price_type VARCHAR(50), -- 'flat_rate', 'hourly', 'estimate_required'
    
    -- Scheduling
    typical_duration_minutes INTEGER,
    requires_estimate BOOLEAN DEFAULT false,
    priority_level INTEGER DEFAULT 1, -- 1-5, 5 being highest
    
    -- Availability
    available_emergency BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    
    -- Description
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for common HVAC services
INSERT INTO service_types (service_name, service_category, base_price, price_type, typical_duration_minutes, requires_estimate, priority_level, available_emergency, description) VALUES
('Emergency Service Call', 'emergency', 175.00, 'flat_rate', 60, false, 5, true, 'After-hours emergency service for urgent HVAC issues'),
('Standard Service Call', 'repair', 135.00, 'flat_rate', 60, false, 3, false, 'Standard diagnostic and repair service during business hours'),
('AC Clean and Check', 'maintenance', 100.00, 'flat_rate', 90, false, 2, false, 'Comprehensive AC system inspection and cleaning'),
('Furnace Clean and Check', 'maintenance', 100.00, 'flat_rate', 90, false, 2, false, 'Comprehensive furnace inspection and cleaning'),
('New AC Installation', 'installation', 0.00, 'estimate_required', 480, true, 4, false, 'Complete AC system installation - free estimate'),
('New Furnace Installation', 'installation', 0.00, 'estimate_required', 480, true, 4, false, 'Complete furnace installation - free estimate'),
('Duct Cleaning', 'maintenance', 299.00, 'flat_rate', 180, false, 2, false, 'Professional duct cleaning and sanitization'),
('Thermostat Replacement', 'repair', 150.00, 'flat_rate', 60, false, 2, false, 'Thermostat replacement and programming'),
('Filter Replacement', 'maintenance', 45.00, 'flat_rate', 15, false, 1, false, 'HVAC filter replacement'),
('Refrigerant Recharge', 'repair', 250.00, 'estimate_required', 90, false, 3, false, 'AC refrigerant recharge - price varies by system size');

CREATE INDEX idx_service_types_category ON service_types(service_category);
CREATE INDEX idx_service_types_active ON service_types(active);

-- ========================================================================
-- APPOINTMENTS TABLE
-- ========================================================================
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    service_type_id INTEGER REFERENCES service_types(id),
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time_start TIME NOT NULL,
    scheduled_time_end TIME,
    duration_minutes INTEGER,
    
    -- Assignment
    assigned_technician VARCHAR(100),
    
    -- Status
    appointment_status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
    
    -- Booking Details
    booking_source VARCHAR(50), -- 'phone_ai', 'online', 'phone_human', 'walk_in'
    booking_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Confirmation & Reminders
    confirmed_at TIMESTAMP,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Notes
    appointment_notes TEXT,
    customer_requests TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(appointment_status);
CREATE INDEX idx_appointments_technician ON appointments(assigned_technician);

-- ========================================================================
-- WORK ORDERS TABLE
-- ========================================================================
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    customer_id INTEGER REFERENCES customers(id),
    
    -- Work Details
    issue_description TEXT,
    work_performed TEXT,
    parts_used TEXT,
    
    -- Equipment Information
    equipment_type VARCHAR(100), -- 'AC', 'Furnace', 'Heat Pump', etc.
    equipment_brand VARCHAR(100),
    equipment_model VARCHAR(100),
    equipment_serial VARCHAR(100),
    equipment_age_years INTEGER,
    
    -- Diagnosis
    problem_found TEXT,
    recommended_repairs TEXT,
    
    -- Technician
    technician_name VARCHAR(100),
    tech_arrival_time TIMESTAMP,
    tech_departure_time TIMESTAMP,
    
    -- Status
    work_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'follow_up_needed'
    
    -- Pricing
    labor_charges DECIMAL(10,2),
    parts_charges DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    
    -- Payment
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'partial', 'pending'
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    
    -- Photos & Documentation
    photo_urls TEXT[], -- Array of URLs to uploaded photos
    
    -- Customer Approval
    requires_customer_approval BOOLEAN DEFAULT false,
    customer_approved BOOLEAN,
    approval_timestamp TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_orders_appointment ON work_orders(appointment_id);
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX idx_work_orders_status ON work_orders(work_status);
CREATE INDEX idx_work_orders_payment ON work_orders(payment_status);

-- ========================================================================
-- FOLLOW_UPS TABLE
-- ========================================================================
CREATE TABLE follow_ups (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    work_order_id INTEGER REFERENCES work_orders(id),
    
    -- Follow-up Details
    follow_up_type VARCHAR(50), -- 'satisfaction_check', 'payment_reminder', 'maintenance_reminder', 'quote_follow_up'
    follow_up_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    
    -- Scheduling
    scheduled_date DATE,
    completed_at TIMESTAMP,
    
    -- Method
    contact_method VARCHAR(50), -- 'ai_call', 'human_call', 'email', 'sms'
    
    -- Content
    follow_up_notes TEXT,
    outcome TEXT,
    
    -- Automation
    auto_scheduled BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_follow_ups_customer ON follow_ups(customer_id);
CREATE INDEX idx_follow_ups_date ON follow_ups(scheduled_date);
CREATE INDEX idx_follow_ups_status ON follow_ups(follow_up_status);

-- ========================================================================
-- REVIEWS TABLE
-- ========================================================================
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    work_order_id INTEGER REFERENCES work_orders(id),
    
    -- Rating
    overall_rating INTEGER, -- 1-5 stars
    service_quality_rating INTEGER,
    professionalism_rating INTEGER,
    communication_rating INTEGER,
    value_rating INTEGER,
    
    -- Review Content
    review_text TEXT,
    
    -- Source
    review_source VARCHAR(50), -- 'direct', 'google', 'yelp', 'facebook'
    public_review_url VARCHAR(500),
    
    -- Sentiment Analysis
    sentiment_score DECIMAL(3,2), -- AI-analyzed sentiment
    
    -- Status
    is_published BOOLEAN DEFAULT false,
    requires_response BOOLEAN DEFAULT false,
    response_sent BOOLEAN DEFAULT false,
    
    -- Metadata
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_customer ON reviews(customer_id);
CREATE INDEX idx_reviews_rating ON reviews(overall_rating);

-- ========================================================================
-- EQUIPMENT_HISTORY TABLE
-- ========================================================================
CREATE TABLE equipment_history (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    
    -- Equipment Details
    equipment_type VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Installation
    install_date DATE,
    warranty_expiration DATE,
    
    -- Specifications
    tonnage DECIMAL(4,2),
    seer_rating INTEGER,
    fuel_type VARCHAR(50),
    
    -- Location
    location_in_home VARCHAR(100), -- 'basement', 'attic', 'closet', etc.
    
    -- Status
    equipment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'replaced', 'removed'
    
    -- Service History Reference
    last_service_date DATE,
    next_service_due DATE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_equipment_customer ON equipment_history(customer_id);
CREATE INDEX idx_equipment_next_service ON equipment_history(next_service_due);

-- ========================================================================
-- AI_INSIGHTS TABLE
-- ========================================================================
CREATE TABLE ai_insights (
    id SERIAL PRIMARY KEY,
    
    -- Insight Details
    insight_type VARCHAR(50), -- 'revenue_opportunity', 'customer_churn_risk', 'efficiency_improvement', 'pricing_anomaly'
    insight_category VARCHAR(50), -- 'sales', 'operations', 'customer_service', 'marketing'
    
    -- Priority
    priority_score INTEGER, -- 1-100
    estimated_value DECIMAL(10,2), -- Potential dollar value
    
    -- Description
    insight_title VARCHAR(255),
    insight_description TEXT,
    recommended_action TEXT,
    
    -- Related Entities
    related_customer_id INTEGER REFERENCES customers(id),
    related_work_order_id INTEGER REFERENCES work_orders(id),
    
    -- Status
    insight_status VARCHAR(50) DEFAULT 'new', -- 'new', 'reviewed', 'actioned', 'dismissed'
    actioned_at TIMESTAMP,
    
    -- Metadata
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_insights_status ON ai_insights(insight_status);
CREATE INDEX idx_insights_priority ON ai_insights(priority_score);
CREATE INDEX idx_insights_generated ON ai_insights(generated_at);

-- ========================================================================
-- CALL_QUEUE TABLE (for AI call handling)
-- ========================================================================
CREATE TABLE call_queue (
    id SERIAL PRIMARY KEY,
    
    -- Call Details
    caller_phone VARCHAR(20) NOT NULL,
    call_sid VARCHAR(100) UNIQUE, -- Twilio/VoIP provider ID
    
    -- Queue Status
    queue_status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed', 'abandoned'
    queue_position INTEGER,
    
    -- Timing
    entered_queue_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    completed_at TIMESTAMP,
    wait_time_seconds INTEGER,
    
    -- Routing
    routed_to VARCHAR(50), -- 'ai', 'human', 'voicemail'
    assigned_agent VARCHAR(100),
    
    -- Priority
    priority_level INTEGER DEFAULT 1, -- Emergency calls get higher priority
    is_callback BOOLEAN DEFAULT false
);

CREATE INDEX idx_call_queue_status ON call_queue(queue_status);
CREATE INDEX idx_call_queue_entered ON call_queue(entered_queue_at);

-- ========================================================================
-- BUSINESS_HOURS TABLE
-- ========================================================================
CREATE TABLE business_hours (
    id SERIAL PRIMARY KEY,
    
    -- Day Configuration
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
    is_open BOOLEAN DEFAULT true,
    
    -- Hours
    open_time TIME,
    close_time TIME,
    
    -- Emergency Coverage
    emergency_available BOOLEAN DEFAULT false,
    emergency_phone VARCHAR(20),
    
    -- Special Notes
    notes TEXT,
    
    CONSTRAINT unique_day UNIQUE(day_of_week)
);

-- Seed business hours (Mon-Fri 8am-6pm, Sat 9am-2pm, Sun closed, 24/7 emergency)
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, emergency_available) VALUES
(0, false, null, null, true), -- Sunday
(1, true, '08:00:00', '18:00:00', true), -- Monday
(2, true, '08:00:00', '18:00:00', true), -- Tuesday
(3, true, '08:00:00', '18:00:00', true), -- Wednesday
(4, true, '08:00:00', '18:00:00', true), -- Thursday
(5, true, '08:00:00', '18:00:00', true), -- Friday
(6, true, '09:00:00', '14:00:00', true); -- Saturday

-- ========================================================================
-- AUTOMATED_TASKS TABLE
-- ========================================================================
CREATE TABLE automated_tasks (
    id SERIAL PRIMARY KEY,
    
    -- Task Definition
    task_type VARCHAR(100), -- 'send_reminder', 'follow_up_call', 'request_review', 'maintenance_reminder'
    task_name VARCHAR(255),
    
    -- Trigger Conditions
    trigger_event VARCHAR(100), -- 'days_after_service', 'days_before_appointment', 'seasonal'
    trigger_offset_days INTEGER,
    
    -- Execution
    execution_method VARCHAR(50), -- 'ai_call', 'sms', 'email'
    template_content TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Statistics
    total_executions INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================================
-- PRICING_RULES TABLE
-- ========================================================================
CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    
    -- Rule Definition
    rule_name VARCHAR(100),
    rule_type VARCHAR(50), -- 'time_multiplier', 'geographic', 'customer_tier', 'seasonal'
    
    -- Conditions
    applies_to_service_ids INTEGER[], -- Array of service_type IDs
    time_conditions VARCHAR(100), -- 'after_hours', 'weekends', 'holidays'
    geographic_conditions VARCHAR(100),
    
    -- Pricing Adjustment
    adjustment_type VARCHAR(50), -- 'percentage', 'fixed_amount'
    adjustment_value DECIMAL(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_start_date DATE,
    effective_end_date DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================================
-- VIEWS FOR COMMON QUERIES
-- ========================================================================

-- Customer Lifetime Value View
CREATE VIEW customer_lifetime_value AS
SELECT 
    c.id as customer_id,
    c.first_name,
    c.last_name,
    c.phone,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT wo.id) as total_work_orders,
    COALESCE(SUM(wo.total_amount), 0) as lifetime_revenue,
    MAX(wo.created_at) as last_service_date,
    AVG(r.overall_rating) as average_rating
FROM customers c
LEFT JOIN appointments a ON c.id = a.customer_id
LEFT JOIN work_orders wo ON c.id = wo.customer_id
LEFT JOIN reviews r ON c.id = r.customer_id
GROUP BY c.id, c.first_name, c.last_name, c.phone;

-- Today's Appointments View
CREATE VIEW todays_appointments AS
SELECT 
    a.id,
    a.scheduled_date,
    a.scheduled_time_start,
    c.first_name,
    c.last_name,
    c.phone,
    c.street_address,
    c.city,
    c.zip_code,
    st.service_name,
    a.appointment_status,
    a.assigned_technician,
    a.appointment_notes
FROM appointments a
JOIN customers c ON a.customer_id = c.id
JOIN service_types st ON a.service_type_id = st.id
WHERE a.scheduled_date = CURRENT_DATE
ORDER BY a.scheduled_time_start;

-- Pending Payments View
CREATE VIEW pending_payments AS
SELECT 
    wo.id as work_order_id,
    c.first_name,
    c.last_name,
    c.phone,
    c.email,
    wo.total_amount,
    wo.payment_status,
    wo.created_at as service_date,
    CURRENT_DATE - wo.created_at::date as days_outstanding
FROM work_orders wo
JOIN customers c ON wo.customer_id = c.id
WHERE wo.payment_status IN ('unpaid', 'partial')
ORDER BY wo.created_at DESC;

-- High-Value Customers View
CREATE VIEW high_value_customers AS
SELECT * FROM customer_lifetime_value
WHERE lifetime_revenue > 1000
ORDER BY lifetime_revenue DESC;

-- ========================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================================================

-- Auto-update updated_at timestamp
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

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_history_updated_at BEFORE UPDATE ON equipment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- PERFORMANCE OPTIMIZATION
-- ========================================================================

-- Enable parallel query execution
ALTER TABLE customers SET (parallel_workers = 4);
ALTER TABLE appointments SET (parallel_workers = 4);
ALTER TABLE work_orders SET (parallel_workers = 4);

-- Statistics for query planner
ANALYZE customers;
ANALYZE appointments;
ANALYZE work_orders;
ANALYZE call_logs;

-- ========================================================================
-- NOTES
-- ========================================================================
-- This schema is designed for:
-- 1. Fast customer lookups during AI phone calls
-- 2. Efficient appointment scheduling and management
-- 3. Complete service history tracking
-- 4. Revenue and business intelligence reporting
-- 5. Automated follow-ups and reminders
-- 6. Integration with AI voice systems (Twilio, ElevenLabs, etc.)
--
-- Key Features:
-- - Phone number-based customer identification
-- - AI call intent detection and routing
-- - Comprehensive service type catalog
-- - Work order and payment tracking
-- - Equipment history for maintenance scheduling
-- - Business intelligence views for common queries
-- - Automated task scheduling
-- - Flexible pricing rules engine
