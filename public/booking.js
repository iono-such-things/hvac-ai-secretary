// Booking Modal JavaScript
const API_BASE = window.location.origin;

// Open booking modal with pre-filled service type
function openBookingModal(serviceTypeId = null, serviceTypeName = '') {
    const modal = document.getElementById('bookingModal');
    modal.style.display = 'block';
    
    // Pre-select service type if provided
    if (serviceTypeId) {
        document.getElementById('serviceType').value = serviceTypeId;
    }
    
    // Scroll to top of modal
    document.getElementById('bookingModalContent').scrollTop = 0;
}

// Close booking modal
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.style.display = 'none';
    
    // Reset form
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingError').style.display = 'none';
    document.getElementById('bookingSuccess').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bookingModal');
    if (event.target === modal) {
        closeBookingModal();
    }
}

// Handle form submission
async function handleBookingSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('bookingForm');
    const submitBtn = document.getElementById('submitBooking');
    const errorDiv = document.getElementById('bookingError');
    const successDiv = document.getElementById('bookingSuccess');
    
    // Hide previous messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    // Collect form data
    const formData = {
        customer_name: form.customerName.value,
        phone: form.phone.value,
        email: form.email.value,
        address: form.address.value,
        city: form.city.value,
        state: form.state.value,
        zip: form.zip.value,
        service_type_id: parseInt(form.serviceType.value),
        preferred_date: form.preferredDate.value,
        preferred_time: form.preferredTime.value,
        issue_description: form.issueDescription.value,
        hvac_type: form.hvacType.value,
        hvac_age: form.hvacAge.value ? parseInt(form.hvacAge.value) : null,
        notes: form.notes.value
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            successDiv.textContent = 'Booking request submitted successfully! We\'ll contact you soon to confirm your appointment.';
            successDiv.style.display = 'block';
            
            // Reset form
            form.reset();
            
            // Close modal after 3 seconds
            setTimeout(() => {
                closeBookingModal();
            }, 3000);
        } else {
            // Show error message
            errorDiv.textContent = data.message || 'Failed to submit booking. Please try again.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Booking submission error:', error);
        errorDiv.textContent = 'Failed to submit booking. Please call us at 412-512-0425.';
        errorDiv.style.display = 'block';
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Booking Request';
    }
}

// Set minimum date to today
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('preferredDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
});
