import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './BookingModal.css';

const BookingModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: date, 2: time, 3: details, 4: confirmation
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    serviceType: 'AC Repair',
    notes: ''
  });

  const serviceTypes = [
    'AC Repair',
    'AC Installation',
    'Furnace Repair',
    'Furnace Installation',
    'Heat Pump Service',
    'Duct Cleaning',
    'Maintenance Service',
    'Emergency Service'
  ];

  // Fetch available time slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async (date) => {
    setLoading(true);
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&timezone=America/New_York`
      );
      
      if (!response.ok) throw new Error('Failed to fetch availability');
      
      const data = await response.json();
      setAvailableSlots(data.availableSlots || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      alert('Failed to load available times. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep(2);
  };

  const handleTimeSelect = (slot) => {
    setSelectedTime(slot);
    setStep(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const appointmentData = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        serviceType: formData.serviceType,
        appointmentDate: selectedTime.start,
        notes: formData.notes
      };

      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
      });

      if (!response.ok) throw new Error('Booking failed');

      const result = await response.json();
      setStep(4);
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to book appointment. Please try again or call us directly.');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      serviceType: 'AC Repair',
      notes: ''
    });
    onClose();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="booking-modal-overlay" onClick={resetModal}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={resetModal}>×</button>
        
        <div className="booking-header">
          <h2>Schedule Service</h2>
          <div className="steps-indicator">
            <span className={step >= 1 ? 'active' : ''}>1. Date</span>
            <span className={step >= 2 ? 'active' : ''}>2. Time</span>
            <span className={step >= 3 ? 'active' : ''}>3. Details</span>
            <span className={step >= 4 ? 'active' : ''}>4. Confirm</span>
          </div>
        </div>

        <div className="booking-content">
          {/* Step 1: Select Date */}
          {step === 1 && (
            <div className="date-selection">
              <h3>Select a Date</h3>
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                minDate={new Date()}
                maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 90 days out
                tileDisabled={({ date }) => {
                  const day = date.getDay();
                  return day === 0; // Disable Sundays
                }}
              />
            </div>
          )}

          {/* Step 2: Select Time */}
          {step === 2 && (
            <div className="time-selection">
              <h3>Available Times for {formatDate(selectedDate)}</h3>
              {loading ? (
                <p>Loading available times...</p>
              ) : availableSlots.length === 0 ? (
                <div>
                  <p>No available times on this date.</p>
                  <button onClick={() => setStep(1)} className="btn-secondary">
                    Choose Different Date
                  </button>
                </div>
              ) : (
                <div className="time-slots">
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      className="time-slot"
                      onClick={() => handleTimeSelect(slot)}
                    >
                      {formatTime(slot.start)} - {formatTime(slot.end)}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep(1)} className="btn-back">
                ← Back to Calendar
              </button>
            </div>
          )}

          {/* Step 3: Enter Details */}
          {step === 3 && (
            <div className="details-form">
              <h3>Appointment Details</h3>
              <p className="selected-time">
                {formatDate(selectedDate)} at {formatTime(selectedTime.start)}
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address">Service Address *</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, State ZIP"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="serviceType">Service Type *</label>
                  <select
                    id="serviceType"
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    required
                  >
                    {serviceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Additional Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Any specific issues or requests?"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                    ← Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Booking...' : 'Book Appointment'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="confirmation">
              <div className="success-icon">✓</div>
              <h3>Appointment Confirmed!</h3>
              <div className="confirmation-details">
                <p><strong>Service:</strong> {formData.serviceType}</p>
                <p><strong>Date & Time:</strong> {formatDate(selectedDate)} at {formatTime(selectedTime.start)}</p>
                <p><strong>Location:</strong> {formData.address}</p>
              </div>
              <p className="confirmation-message">
                A confirmation email has been sent to {formData.email}. 
                We'll send you a reminder 24 hours before your appointment.
              </p>
              <button onClick={resetModal} className="btn-primary">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;