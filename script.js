document.addEventListener('DOMContentLoaded', () => {
    // ---- STATE ----
    let state = {
        users: [], // e.g. [{ id: 'u1', name: 'Alice', colorClass: 'user-1' }]
        slots: [], // e.g. [{ id: 's1', userId: 'u1', day: 'Mon', start: '18:00', end: '20:00' }]
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        maxHours: 12
    };

    // ---- DOM ELEMENTS ----
    const setupModal = document.getElementById('setup-modal');
    const setupForm = document.getElementById('setup-form');
    const numUsersSelect = document.getElementById('num-users');
    const userNamesContainer = document.getElementById('user-names-container');

    const dashboardContainer = document.querySelector('.dashboard-container');
    const scheduleGrid = document.getElementById('schedule-grid');
    const headerLegend = document.getElementById('header-legend');

    const statsBarsContainer = document.getElementById('stats-bars-container');
    const summaryRowsContainer = document.getElementById('summary-rows-container');

    const slotModal = document.getElementById('slot-modal');
    const slotForm = document.getElementById('slot-form');
    const modalTitle = document.getElementById('modal-title');
    const modalUserToggles = document.getElementById('modal-user-toggles');

    const addSlotBtn = document.getElementById('add-slot-btn');
    const cancelBtn = document.getElementById('cancel-slot-btn');
    const deleteBtn = document.getElementById('delete-slot-btn');

    // Hide dashboard container until setup is complete
    dashboardContainer.style.display = 'none';

    // ---- HELPER FUNCTIONS ----
    const generateId = () => Math.random().toString(36).substr(2, 9);

    const calculateHours = (start, end) => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return (eh + em / 60) - (sh + sm / 60);
    };

    const formatTime = (time24) => {
        let [h, m] = time24.split(':').map(Number);
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        return `${h}${m === 0 ? '' : ':' + m.toString().padStart(2, '0')}${ampm}`;
    };

    // ---- SETUP EVENT LISTENERS ----
    const renderSetupInputs = () => {
        const num = parseInt(numUsersSelect.value);
        userNamesContainer.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label for="setup-name-${i}">User ${i + 1} Name</label>
                <input type="text" id="setup-name-${i}" required placeholder="Name ${i + 1}">
            `;
            userNamesContainer.appendChild(div);
        }
    };

    numUsersSelect.addEventListener('change', renderSetupInputs);
    renderSetupInputs(); // init first view

    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const num = parseInt(numUsersSelect.value);
        state.users = [];
        for (let i = 0; i < num; i++) {
            state.users.push({
                id: `u${i + 1}`,
                name: document.getElementById(`setup-name-${i}`).value,
                colorClass: `user-${i + 1}`
            });
        }

        setupModal.classList.remove('active');
        dashboardContainer.style.display = 'block';
        initDashboard();
    });

    // ---- INITIALIZE DASHBOARD UI PIECES ----
    const initDashboard = () => {
        // Build Legend
        headerLegend.innerHTML = '';
        state.users.forEach(u => {
            headerLegend.innerHTML += `
                <div class="legend-item">
                    <span class="legend-color ${u.colorClass}"></span> <span class="name-var-${u.id}">${u.name}</span>
                </div>
            `;
        });

        // Set Grid Columns
        scheduleGrid.style.gridTemplateColumns = `35px repeat(${state.users.length}, 1fr)`;

        // Build Modal Toggles
        modalUserToggles.innerHTML = '';
        state.users.forEach((u, i) => {
            const checked = i === 0 ? 'checked' : '';
            modalUserToggles.innerHTML += `
                <input type="radio" id="modal-user-${u.id}" name="userId" value="${u.id}" ${checked}>
                <label for="modal-user-${u.id}" class="toggle-btn" id="toggle-label-${u.id}">${u.name}</label>
            `;
        });

        // Setup radio change listener to dynamically apply styles
        const radios = document.querySelectorAll('input[name="userId"]');
        const updateRadioStyles = () => {
            state.users.forEach(u => {
                const label = document.getElementById(`toggle-label-${u.id}`);
                const radio = document.getElementById(`modal-user-${u.id}`);
                if (radio.checked) {
                    label.classList.add(`${u.colorClass}-toggle-checked`);
                } else {
                    label.classList.remove(`${u.colorClass}-toggle-checked`);
                }
            });
        };
        radios.forEach(r => r.addEventListener('change', updateRadioStyles));
        updateRadioStyles(); // init colors

        renderSchedule();
        setTimeout(renderStats, 100);
    };

    // ---- RENDERING ----
    const renderSchedule = () => {
        scheduleGrid.innerHTML = '';

        state.days.forEach(day => {
            // Day Label
            const dayLabel = document.createElement('div');
            dayLabel.className = 'day-label';
            dayLabel.textContent = day;
            scheduleGrid.appendChild(dayLabel);

            // Find slots for this day
            const daySlots = state.slots.filter(s => s.day === day);

            // Render 1 slot per user
            state.users.forEach((user, i) => {
                const slotDiv = document.createElement('div');
                const slot = daySlots.find(s => s.userId === user.id);

                if (slot) {
                    slotDiv.className = `slot ${user.colorClass}-slot`;
                    slotDiv.textContent = `${user.name} ${formatTime(slot.start)}–${formatTime(slot.end)}`;
                    slotDiv.onclick = () => openModal(slot);
                } else {
                    // Empty slot
                    slotDiv.className = `slot empty-slot`;
                    slotDiv.textContent = '—';
                    slotDiv.onclick = () => openModal({ day, isNew: true, userId: user.id });
                }
                scheduleGrid.appendChild(slotDiv);
            });
        });
    };

    const renderStats = () => {
        // Calc hours
        const userStats = state.users.map(u => ({
            ...u,
            hours: 0,
            sessions: 0
        }));

        state.slots.forEach(slot => {
            const h = calculateHours(slot.start, slot.end);
            const userStat = userStats.find(us => us.id === slot.userId);
            if (userStat) {
                userStat.hours += h;
                userStat.sessions++;
            }
        });

        const totalHours = userStats.reduce((sum, u) => sum + u.hours, 0);

        // Build HTML for bars and summary
        statsBarsContainer.innerHTML = '';
        summaryRowsContainer.innerHTML = '';

        const max = Math.max(state.maxHours, ...userStats.map(u => u.hours));

        userStats.forEach(u => {
            // Generate Bar Chart
            const pct = Math.min((u.hours / max) * 100, 100);
            const remPct = Math.max(100 - pct, 0);

            statsBarsContainer.innerHTML += `
                <div class="chart-person">
                    <div class="chart-label"><span class="name-var-${u.id}">${u.name}</span></div>
                    <div class="bar-chart">
                        <div class="bar-used bar-${u.colorClass}-used" style="width: 0%;" data-target="${pct}%">Used: ${u.hours}h</div>
                    </div>
                    <div class="bar-chart">
                        <div class="bar-remaining bar-${u.colorClass}-remaining" style="width: 0%;" data-target="${remPct}%">Remaining: ${max - u.hours}h</div>
                    </div>
                </div>
            `;

            // Generate Summary Row
            summaryRowsContainer.innerHTML += `
                <div class="summary-row ${u.colorClass}-summary">
                    <span class="name-var-${u.id}">${u.name}</span>: ${u.hours}h used &middot; ${u.sessions} sessions
                </div>
            `;
        });

        summaryRowsContainer.innerHTML += `
            <div class="summary-row total-summary">
                Total this week: ${totalHours} hours
            </div>
        `;

        // Animate Bars
        setTimeout(() => {
            document.querySelectorAll('.bar-used, .bar-remaining').forEach(bar => {
                bar.style.width = bar.getAttribute('data-target');
            });
        }, 50);

        renderBalanceScore(userStats, totalHours);
    };

    const renderBalanceScore = (userStats, totalHours) => {
        let score = 100;

        if (totalHours > 0) {
            const maxHrs = Math.max(...userStats.map(u => u.hours));
            const minHrs = Math.min(...userStats.map(u => u.hours));
            const diff = maxHrs - minHrs;

            // Formula adapted for N users: difference between max and min, divided by max allowed diff
            // Max allowed diff could be an average load (total / users.length).
            const avg = totalHours / userStats.length;
            const maxAllowedDiff = Math.max(avg, 1);
            score = 100 - (diff / maxAllowedDiff) * 50;
            score = Math.max(0, Math.min(100, Math.round(score)));
        }

        // Animate Score Value
        const scoreVal = document.querySelector('.score-value');
        let currentScore = parseInt(scoreVal.innerText) || 0;
        const scoreDiff = score - currentScore;
        const steps = 20;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            if (scoreVal) { // Safety check
                scoreVal.innerText = Math.round(currentScore + (scoreDiff * (step / steps)));
            }
            if (step >= steps) {
                if (scoreVal) scoreVal.innerText = score;
                clearInterval(interval);
            }
        }, 20);

        // Update Gauge SVG
        const gauge = document.querySelector('.gauge-fill');
        if (gauge) {
            const dasharray = 289;
            const offset = dasharray - (dasharray * (score / 100));
            setTimeout(() => { gauge.style.strokeDashoffset = offset; }, 100);

            // Update Gauge Color and Status Button
            const statusBtn = document.querySelector('.status-button');
            let color, statusText;

            if (score >= 90) { color = '#00ffcc'; statusText = 'PERFECT BALANCE'; }
            else if (score >= 70) { color = 'var(--user-1-bg)'; statusText = 'GOOD BALANCE'; }
            else if (score >= 50) { color = '#ffcc00'; statusText = 'FAIR BALANCE'; }
            else { color = 'var(--user-2-bg)'; statusText = 'ACTION NEEDED'; }

            gauge.style.stroke = color;
            if (statusBtn) {
                statusBtn.textContent = statusText;
                statusBtn.style.backgroundColor = color;
                statusBtn.style.color = (score >= 50 && score < 90) || score < 50 ? '#fff' : '#112027';
            }
        }
    };

    // ---- MODAL LOGIC ----
    const openModal = (slotData = {}) => {
        slotForm.reset();

        // Reset toggle classes explicitly here as simple Form reset might miss trigger change event
        state.users.forEach(u => {
            const label = document.getElementById(`toggle-label-${u.id}`);
            if (label) label.classList.remove(`${u.colorClass}-toggle-checked`);
        });

        if (slotData.id) {
            // Edit Mode
            modalTitle.textContent = 'Edit Reservation';
            document.getElementById('slot-id').value = slotData.id;
            const radio = document.getElementById(`modal-user-${slotData.userId}`);
            if (radio) {
                radio.checked = true;
                document.getElementById(`toggle-label-${slotData.userId}`).classList.add(`${state.users.find(u => u.id === slotData.userId).colorClass}-toggle-checked`);
            }
            document.getElementById('slot-day').value = slotData.day;
            document.getElementById('slot-start').value = slotData.start;
            document.getElementById('slot-end').value = slotData.end;
            deleteBtn.style.display = 'block';
        } else {
            // Add Mode
            modalTitle.textContent = 'Add Reservation';
            document.getElementById('slot-id').value = '';

            // Check specific user if passed (like clicking empty slot)
            let initialUser = state.users[0].id;
            if (slotData.userId) {
                initialUser = slotData.userId;
            }
            const radio = document.getElementById(`modal-user-${initialUser}`);
            if (radio) {
                radio.checked = true;
                document.getElementById(`toggle-label-${initialUser}`).classList.add(`${state.users.find(u => u.id === initialUser).colorClass}-toggle-checked`);
            }

            if (slotData.day) document.getElementById('slot-day').value = slotData.day;
            deleteBtn.style.display = 'none';
        }

        slotModal.classList.add('active');
    };

    const closeSlotModal = () => {
        slotModal.classList.remove('active');
    };

    // ---- EVENT LISTENERS ----
    addSlotBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeSlotModal);

    // Close modal on outside click
    slotModal.addEventListener('click', (e) => {
        if (e.target === slotModal) closeSlotModal();
    });

    slotForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('slot-id').value;
        const userId = document.querySelector('input[name="userId"]:checked').value;
        const day = document.getElementById('slot-day').value;
        const start = document.getElementById('slot-start').value;
        const end = document.getElementById('slot-end').value;

        // Validation - end must be after start
        if (calculateHours(start, end) <= 0) {
            alert('End time must be after start time.');
            return;
        }

        if (id) {
            // Update existng
            const index = state.slots.findIndex(s => s.id === id);
            if (index !== -1) {
                state.slots[index] = { id, userId, day, start, end };
            }
        } else {
            // Add new
            state.slots.push({ id: generateId(), userId, day, start, end });
        }

        closeSlotModal();
        renderSchedule();
        renderStats();
    });

    deleteBtn.addEventListener('click', () => {
        const id = document.getElementById('slot-id').value;
        if (id) {
            state.slots = state.slots.filter(s => s.id !== id);
            closeSlotModal();
            renderSchedule();
            renderStats();
        }
    });

});
