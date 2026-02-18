/* ============================================================
   M. Jacob Company — Booking Modal
   Two paths: (1) Pick a time slot  (2) Schedule a call-back
   ============================================================ */

(function () {
  'use strict';

  /* ---- State ---- */
  let selectedDate = null;   // Date object
  let selectedSlot = null;   // hour integer
  let calViewYear  = null;
  let calViewMonth = null;

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  /* ---- Helpers ---- */
  function fmt12(hour) {
    const ampm = hour < 12 ? 'AM' : 'PM';
    const h    = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  }
  function fmtDate(d) {
    return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  }
  function el(id) { return document.getElementById(id); }

  /* ---- Open / Close ---- */
  window.openBookingModal = function (preselect) {
    const overlay = el('bookingOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Go straight to call-back form (slot booking not yet enabled)
    el('bookingModalTitle').textContent = 'Request a Call-Back';
    showOnly('bkCallSection');
    if (preselect) {
      ['bkService','bkCallService'].forEach(function(id) {
        const s = el(id);
        if (!s) return;
        const opt = Array.from(s.options).find(function(o) {
          return o.value === preselect || o.text.includes(preselect);
        });
        if (opt) s.value = opt.value;
      });
    }
  };

  window.closeBookingModal = function () {
    el('bookingOverlay').classList.remove('active');
    document.body.style.overflow = '';
    resetAll();
  };

  /* ---- Section visibility ---- */
  var SECTIONS = ['bkPaths','bkCalSection','bkSlotsSection','bkFormSection',
                  'bkConfirmSection','bkCallSection','bkCallConfirmSection'];
  function showOnly(id) {
    SECTIONS.forEach(function(s) {
      var e = el(s);
      if (e) e.style.display = 'none';
    });
    var target = el(id);
    if (target) target.style.display = 'block';
  }

  function showPathChooser() {
    el('bookingModalTitle').textContent = 'Schedule Service';
    showOnly('bkPaths');
  }

  /* ---- Path chooser ---- */
  window.choosePath = function (path) {
    if (path === 'slot') {
      el('bookingModalTitle').textContent = 'Pick a Date';
      showOnly('bkCalSection');
      initCalendar();
    } else {
      el('bookingModalTitle').textContent = 'Schedule a Call-Back';
      showOnly('bkCallSection');
    }
  };

  /* ---- Calendar ---- */
  function initCalendar() {
    var now = new Date();
    calViewYear  = now.getFullYear();
    calViewMonth = now.getMonth();
    renderCalendar();
  }

  function renderCalendar() {
    var grid    = el('bkCalGrid');
    var label   = el('bkCalMonthLabel');
    var prevBtn = el('bkCalPrev');
    var now     = new Date();
    now.setHours(0,0,0,0);

    label.textContent = MONTHS[calViewMonth] + ' ' + calViewYear;

    var isCurrentMonth = calViewYear === now.getFullYear() && calViewMonth === now.getMonth();
    prevBtn.disabled = isCurrentMonth;

    var maxDate = new Date(now);
    maxDate.setMonth(maxDate.getMonth() + 3);

    grid.innerHTML = '';

    // Day-of-week headers
    DAYS.forEach(function(d) {
      var cell = document.createElement('div');
      cell.className = 'bk-cal-dow';
      cell.textContent = d;
      grid.appendChild(cell);
    });

    var firstDay    = new Date(calViewYear, calViewMonth, 1).getDay();
    var daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();

    for (var i = 0; i < firstDay; i++) {
      var empty = document.createElement('div');
      empty.className = 'bk-cal-day empty';
      grid.appendChild(empty);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      (function(day) {
        var thisDate = new Date(calViewYear, calViewMonth, day);
        var dow      = thisDate.getDay();
        var isPast   = thisDate < now;
        var isFuture = thisDate > maxDate;
        var isSunday = dow === 0;

        var btn = document.createElement('button');
        btn.className = 'bk-cal-day';
        btn.textContent = day;

        if (thisDate.toDateString() === now.toDateString()) btn.classList.add('today');
        if (selectedDate && thisDate.toDateString() === selectedDate.toDateString()) btn.classList.add('selected');

        if (isPast || isFuture || isSunday) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', function() { selectDate(thisDate); });
        }
        grid.appendChild(btn);
      })(d);
    }
  }

  window.calPrev = function () {
    calViewMonth--;
    if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
    renderCalendar();
  };
  window.calNext = function () {
    calViewMonth++;
    if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
    renderCalendar();
  };

  function selectDate(date) {
    selectedDate = date;
    selectedSlot = null;
    renderCalendar();

    el('bookingModalTitle').textContent = 'Pick a Time';
    showOnly('bkSlotsSection');
    el('bkSlotsDateLabel').textContent = fmtDate(date);

    var slotsEl = el('bkSlotsGrid');
    slotsEl.innerHTML = '<div class="bk-loading"><div class="bk-spinner"></div> Loading times…</div>';

    var iso = date.toISOString().split('T')[0];
    fetch('/api/availability?date=' + iso)
      .then(function(r) { return r.json(); })
      .then(function(data) { renderSlots(data.slots || []); })
      .catch(function() {
        slotsEl.innerHTML = '<p class="bk-no-slots">Could not load times. Please try again.</p>';
      });
  }

  function renderSlots(slots) {
    var grid = el('bkSlotsGrid');
    grid.innerHTML = '';

    if (slots.length === 0) {
      grid.innerHTML = '<p class="bk-no-slots">No availability this day.<br>Try another date.</p>';
      return;
    }

    slots.forEach(function(slot) {
      var btn = document.createElement('button');
      btn.className = 'bk-slot' + (slot.available ? '' : ' unavailable');
      btn.textContent = fmt12(slot.hour);
      btn.disabled = !slot.available;
      if (slot.available) {
        btn.addEventListener('click', function() { selectSlot(slot.hour, btn); });
      }
      grid.appendChild(btn);
    });
  }

  function selectSlot(hour, btnEl) {
    document.querySelectorAll('.bk-slot.selected').forEach(function(b) { b.classList.remove('selected'); });
    btnEl.classList.add('selected');
    selectedSlot = hour;
    el('bkFormChip').textContent = '📅 ' + fmtDate(selectedDate) + ' at ' + fmt12(hour);
    el('bookingModalTitle').textContent = 'Your Details';
    showOnly('bkFormSection');
  }

  /* ---- Back navigation ---- */
  window.backToPaths   = function () { el('bookingModalTitle').textContent = 'Schedule Service'; showOnly('bkPaths'); };
  window.backToCalendar = function () { el('bookingModalTitle').textContent = 'Pick a Date'; showOnly('bkCalSection'); };
  window.backToSlots   = function () { el('bookingModalTitle').textContent = 'Pick a Time'; showOnly('bkSlotsSection'); };

  /* ---- Submit booking ---- */
  window.submitBooking = function (e) {
    e.preventDefault();
    var btn = el('bkSubmitBtn');
    var msg = el('bkFormMsg');
    msg.className = 'bk-msg';
    msg.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Booking…';

    var body = {
      name:    el('bkName').value.trim(),
      phone:   el('bkPhone').value.trim(),
      email:   el('bkEmail').value.trim(),
      service: el('bkService').value,
      address: el('bkAddress').value.trim(),
      date:    selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      slot:    selectedSlot,
      notes:   el('bkNotes').value.trim(),
      type:    'booking',
    };

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (res.ok && res.data.success) {
        el('bkConfirmDate').textContent  = fmtDate(selectedDate) + ' at ' + fmt12(selectedSlot);
        el('bkConfirmName').textContent  = body.name;
        el('bkConfirmSvc').textContent   = body.service;
        el('bkConfirmAddr').textContent  = body.address;
        el('bookingModalTitle').textContent = 'You\'re Booked!';
        showOnly('bkConfirmSection');
      } else {
        throw new Error(res.data.message || 'Request failed');
      }
    })
    .catch(function(err) {
      msg.textContent = '⚠ ' + (err.message || 'Something went wrong. Please call us at (412) 512-0425.');
      msg.className = 'bk-msg error';
      btn.disabled = false;
      btn.textContent = 'Confirm Booking';
    });
  };

  /* ---- Submit call-back ---- */
  window.submitCallBack = function (e) {
    e.preventDefault();
    var btn = el('bkCallSubmitBtn');
    var msg = el('bkCallMsg');
    msg.className = 'bk-msg';
    msg.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Sending…';

    var body = {
      name:      el('bkCallName').value.trim(),
      phone:     el('bkCallPhone').value.trim(),
      email:     el('bkCallEmail').value.trim(),
      service:   el('bkCallService').value,
      best_time: el('bkCallBestTime').value,
      notes:     el('bkCallNotes').value.trim(),
      type:      'callback',
    };

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (res.ok && res.data.success) {
        el('bkCallConfirmName').textContent = body.name;
        el('bkCallConfirmTime').textContent = body.best_time || 'during business hours';
        el('bookingModalTitle').textContent = 'Request Sent!';
        showOnly('bkCallConfirmSection');
      } else {
        throw new Error(res.data.message || 'Request failed');
      }
    })
    .catch(function(err) {
      msg.textContent = '⚠ ' + (err.message || 'Something went wrong. Please call us at (412) 512-0425.');
      msg.className = 'bk-msg error';
      btn.disabled = false;
      btn.textContent = 'Request Call-Back';
    });
  };

  /* ---- Reset ---- */
  function resetAll() {
    selectedDate = null;
    selectedSlot = null;
    document.querySelectorAll('.bk-slot.selected').forEach(function(b) { b.classList.remove('selected'); });
    ['bkBookingForm','bkCallForm'].forEach(function(id) {
      var f = el(id);
      if (f) f.reset();
    });
    [el('bkFormMsg'), el('bkCallMsg')].forEach(function(m) {
      if (m) { m.className = 'bk-msg'; m.style.display = 'none'; }
    });
  }

  /* ---- Close on overlay click / Escape ---- */
  document.addEventListener('DOMContentLoaded', function() {
    var overlay = el('bookingOverlay');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeBookingModal();
      });
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        closeBookingModal();
      }
    });
  });

})();
