const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// POST /api/bookings - Create new booking from customer form
router.post('/', async (req, res) => {
  const {
    customer_name,
    phone,
    email,
    address,
    city,
    state,
    zip,
    service_type_id,
    preferred_date,
    preferred_time,
    notes,
    hvac_type,
    hvac_age,
    issue_description
  } = req.body;

  try {
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if customer exists, if not create
      let customerId;
      const existingCustomer = await client.query(
        'SELECT customer_id FROM CUSTOMERS WHERE phone = $1 OR email = $2',
        [phone, email]
      );

      if (existingCustomer.rows.length > 0) {
        customerId = existingCustomer.rows[0].customer_id;
        
        // Update customer info
        await client.query(
          `UPDATE CUSTOMERS 
           SET name = $1, email = $2, address = $3, city = $4, state = $5, zip = $6
           WHERE customer_id = $7`,
          [customer_name, email, address, city, state, zip, customerId]
        );
      } else {
        // Create new customer
        const newCustomer = await client.query(
          `INSERT INTO CUSTOMERS (name, phone, email, address, city, state, zip, preferred_contact_method)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING customer_id`,
          [customer_name, phone, email, address, city, state, zip, email ? 'email' : 'phone']
        );
        customerId = newCustomer.rows[0].customer_id;
      }

      // Create service request
      const serviceRequest = await client.query(
        `INSERT INTO SERVICE_REQUESTS 
         (customer_id, service_type_id, status, priority, preferred_date, preferred_time, notes, issue_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING request_id`,
        [customerId, service_type_id, 'pending', 'medium', preferred_date, preferred_time, notes, issue_description]
      );

      const requestId = serviceRequest.rows[0].request_id;

      // If HVAC info provided, create/update equipment record
      if (hvac_type || hvac_age) {
        await client.query(
          `INSERT INTO EQUIPMENT (customer_id, equipment_type, age_years, last_service_date)
           VALUES ($1, $2, $3, CURRENT_DATE)
           ON CONFLICT (customer_id, equipment_type) 
           DO UPDATE SET age_years = $3, last_service_date = CURRENT_DATE`,
          [customerId, hvac_type || 'Unknown', hvac_age || 0]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Booking request received successfully',
        request_id: requestId,
        customer_id: customerId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

// GET /api/bookings/:id - Get specific booking details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        sr.request_id,
        sr.status,
        sr.priority,
        sr.preferred_date,
        sr.preferred_time,
        sr.scheduled_date,
        sr.scheduled_time,
        sr.notes,
        sr.issue_description,
        c.name as customer_name,
        c.phone,
        c.email,
        c.address,
        c.city,
        c.state,
        c.zip,
        st.service_name,
        st.base_price,
        t.name as tech_name,
        t.phone as tech_phone
      FROM SERVICE_REQUESTS sr
      JOIN CUSTOMERS c ON sr.customer_id = c.customer_id
      LEFT JOIN SERVICE_TYPES st ON sr.service_type_id = st.service_type_id
      LEFT JOIN TECHNICIANS t ON sr.assigned_tech_id = t.tech_id
      WHERE sr.request_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve booking' });
  }
});

module.exports = router;
