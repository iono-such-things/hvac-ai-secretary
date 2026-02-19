// M. Jacob Company - Scheduling Script

// Mobile Navigation Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// Modal
const modal = document.getElementById('bookingModal');

function openModal(topic = '') {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    if (topic) {
        const topicSelect = document.getElementById('topic');
        const option = Array.from(topicSelect.options).find(opt =>
            opt.value === topic || opt.textContent.includes(topic)
        );
        if (option) topicSelect.value = option.value;
    }

    // Set min date to next weekday
    const dateInput = document.getElementById('date');
    dateInput.setAttribute('min', getNextWeekday());
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('bookingForm').reset();
    hideMessage();
}

window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') closeModal();
});

// Helpers
function getNextWeekday() {
    const d = new Date();
    d.setDate(d.getDate() + 1); // at least tomorrow
    while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
}

function isWeekday(dateStr) {
    // Parse as local date to avoid timezone shifts
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return day !== 0 && day !== 6;
}

function showMessage(msg, type = 'success') {
    const el = document.getElementById('formMessage');
    el.textContent = msg;
    el.className = `form-message ${type}`;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMessage() {
    const el = document.getElementById('formMessage');
    el.style.display = 'none';
}

// Date validation — block weekends on change
document.getElementById('date')?.addEventListener('change', (e) => {
    if (e.target.value && !isWeekday(e.target.value)) {
        showMessage('Please select a weekday (Monday–Friday). We don\'t schedule calls on weekends.', 'error');
        e.target.value = '';
    } else {
        hideMessage();
    }
});

// Form Submission
async function handleSubmit(event) {
    event.preventDefault();
    hideMessage();

    const form = document.getElementById('bookingForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    // Validate weekday again on submit
    const dateVal = document.getElementById('date').value;
    if (!isWeekday(dateVal)) {
        showMessage('Please select a weekday (Monday–Friday).', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Scheduling...';

    const formData = {
        name:   document.getElementById('name').value.trim(),
        phone:  document.getElementById('phone').value.trim(),
        email:  document.getElementById('email').value.trim(),
        topic:  document.getElementById('topic').value,
        date:   dateVal,
        window: document.getElementById('window').value,
        notes:  document.getElementById('notes').value.trim(),
    };

    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            const windowLabel = {
                '8:00-10:00':   '8:00 AM – 10:00 AM',
                '10:00-12:00':  '10:00 AM – 12:00 PM',
                '12:00-14:00':  '12:00 PM – 2:00 PM',
                '13:00-15:00':  '1:00 PM – 3:00 PM',
            }[formData.window] || formData.window;

            showMessage(
                `✓ You're booked! Expect a call on ${formData.date} between ${windowLabel}. ` +
                `A confirmation has been sent to ${formData.email}.`,
                'success'
            );

            setTimeout(() => { form.reset(); hideMessage(); }, 4000);
            setTimeout(() => { closeModal(); }, 6000);
        } else {
            const err = await response.json().catch(() => ({}));
            if (err.conflict) {
                showMessage(
                    'That time window is already booked. Please pick a different window or day.',
                    'error'
                );
            } else {
                throw new Error('Server error');
            }
        }
    } catch (err) {
        console.error('Booking error:', err);
        showMessage(
            'Could not connect to our scheduling system. Please call us directly at (412) 512-0425.',
            'error'
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

document.getElementById('bookingForm').addEventListener('submit', handleSubmit);

// Phone formatting
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 10);
        if (v.length >= 6) v = `(${v.slice(0,3)}) ${v.slice(3,6)}-${v.slice(6)}`;
        else if (v.length >= 3) v = `(${v.slice(0,3)}) ${v.slice(3)}`;
        e.target.value = v;
    });
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = document.querySelector('.nav').offsetHeight;
            window.scrollTo({ top: target.offsetTop - navHeight, behavior: 'smooth' });
        }
    });
});

// Nav shadow on scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.pageYOffset > 100 ? '0 2px 8px rgba(0,0,0,0.3)' : 'none';
});

console.log('M. Jacob Company scheduling loaded.');