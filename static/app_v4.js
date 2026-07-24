document.addEventListener('DOMContentLoaded', () => {
    function handleApiError(status, detail) {
        if (status === 429) {
            alert("⚠️ API Limit Reached! You have exhausted your quota. Please wait a moment before trying again.");
        } else if (status === 500 && detail && detail.toLowerCase().includes("quota")) {
            alert("⚠️ API Limit Reached! You have exhausted your quota. Please wait a moment before trying again.");
        } else {
            alert("Error: " + (detail || "An unexpected error occurred."));
        }
    }

    // Navigation Logic
    const navLinks = document.querySelectorAll('.nav-link');
    const viewSections = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active classes
            navLinks.forEach(l => l.classList.remove('active'));
            viewSections.forEach(v => v.classList.remove('active'));

            // Add active class to clicked
            link.classList.add('active');
            const targetViewId = link.getAttribute('data-view');
            document.getElementById(targetViewId).classList.add('active');
        });
    });

    // Task Manager Logic
    const goalInput = document.getElementById('goal-input');
    const breakdownBtn = document.getElementById('breakdown-btn');
    const addBtn = document.getElementById('add-btn');
    const blockerSelect = document.getElementById('blocker-select');
    const goalSpinner = document.getElementById('goal-spinner');
    const taskList = document.getElementById('task-list');
    const completedTaskList = document.getElementById('completed-task-list');

    let prodChart = null; // for Analytics

    // Profile & XP
    async function fetchProfile() {
        try {
            const res = await fetch('/api/profile');
            if (res.ok) {
                const profile = await res.json();
                document.getElementById('user-level').textContent = profile.level;
                document.getElementById('user-xp').textContent = profile.xp;
                const progress = (profile.xp % 500) / 500 * 100;
                document.getElementById('xp-fill').style.width = `${progress}%`;
            }
        } catch(e) { console.error(e); }
    }
    
    fetchProfile();

    // Fetch initial tasks
    fetchTasks();

    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const goal = goalInput.value.trim();
            if (!goal) return;
            
            const timeStr = prompt("Enter estimated time in minutes (leave blank for AI to generate):");
            if (timeStr === null) return; // cancelled
            
            const estimated_minutes = timeStr ? parseInt(timeStr, 10) : null;
            const blocked_by_id = blockerSelect ? parseInt(blockerSelect.value) || null : null;

            const originalHTML = addBtn.innerHTML;
            addBtn.innerHTML = `<div class="spinner"></div>`;
            addBtn.disabled = true;

            try {
                const response = await fetch('/api/tasks/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ goal, estimated_minutes, blocked_by_id })
                });
                
                if (response.ok) {
                    goalInput.value = '';
                    fetchTasks();
                } else {
                    const err = await response.json();
                    handleApiError(response.status, err.detail);
                }
            } catch (error) {
                console.error(error);
            } finally {
                addBtn.innerHTML = originalHTML;
                addBtn.disabled = false;
            }
        });
    }

    breakdownBtn.addEventListener('click', async () => {
        const goal = goalInput.value.trim();
        if (!goal) return;

        const originalHTML = breakdownBtn.innerHTML;
        breakdownBtn.innerHTML = `<span>Loading...</span><div class="spinner" id="goal-spinner"></div>`;
        breakdownBtn.disabled = true;
        breakdownBtn.style.cursor = 'not-allowed';
        breakdownBtn.classList.add('loading');

        try {
            const response = await fetch('/api/tasks/breakdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal })
            });
            
            if (response.ok) {
                const newTasks = await response.json();
                goalInput.value = '';
                fetchTasks();
            } else {
                const err = await response.json();
                handleApiError(response.status, err.detail);
            }
        } catch (error) {
            console.error(error);
        } finally {
            breakdownBtn.innerHTML = originalHTML;
            breakdownBtn.disabled = false;
            breakdownBtn.style.cursor = '';
            breakdownBtn.classList.remove('loading');
        }
    });

    async function fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (response.ok) {
                const tasks = await response.json();
                renderTasks(tasks);
                updateBlockerSelect(tasks);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    }

    function updateBlockerSelect(tasks) {
        if (!blockerSelect) return;
        const currentVal = blockerSelect.value;
        blockerSelect.innerHTML = '<option value="">No Blockers</option>';
        tasks.forEach(t => {
            if (!t.is_completed) {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.title;
                blockerSelect.appendChild(opt);
            }
        });
        blockerSelect.value = currentVal;
    }

    function renderTasks(tasks) {
        if (taskList) taskList.innerHTML = '';
        if (completedTaskList) completedTaskList.innerHTML = '';
        
        // Views
        const views = {
            'matrix-view': document.getElementById('task-view'),
            'analytics-view': document.getElementById('analytics-view'),
            'history-view': document.getElementById('history-view'),
            'schedule-view': document.getElementById('schedule-view')
        };
        
        const q1 = document.getElementById('quadrant-1');
        const q2 = document.getElementById('quadrant-2');
        const q3 = document.getElementById('quadrant-3');
        const q4 = document.getElementById('quadrant-4');
        
        if (q1) q1.innerHTML = '';
        if (q2) q2.innerHTML = '';
        if (q3) q3.innerHTML = '';
        if (q4) q4.innerHTML = '';

        tasks.forEach(task => {
            const isBlocked = task.blocked_by_id && tasks.some(t => t.id === task.blocked_by_id && !t.is_completed);
            
            const taskCard = document.createElement('div');
            taskCard.className = `task-card ${task.is_completed ? 'completed' : ''} ${isBlocked ? 'blocked' : ''}`;
            taskCard.dataset.id = task.id;

            let microStepsHtml = '';
            if (task.microsteps && task.microsteps.length > 0) {
                microStepsHtml = `
                    <div class="microsteps-container">
                        ${task.microsteps.map(step => `
                            <div class="microstep-item ${step.is_completed ? 'completed' : ''}" data-id="${step.id}">
                                <div class="custom-checkbox ${step.is_completed ? 'checked' : ''} ${isBlocked ? 'disabled' : ''}" onclick="toggleMicrostep(${step.id})">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="${step.is_completed ? '' : 'hidden'}"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <span>${step.title}</span>
                                ${step.resource_links ? `<a href="${step.resource_links}" target="_blank" class="resource-link" title="Helpful Resource">🔗</a>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            taskCard.innerHTML = `
                <div class="task-content">
                    <div class="task-header">
                        <div class="task-title-group">
                            <div class="custom-checkbox ${task.is_completed ? 'checked' : ''} ${isBlocked ? 'disabled' : ''}" onclick="toggleTaskCompletion(${task.id})">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="${task.is_completed ? '#22c55e' : 'white'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="${task.is_completed ? '' : 'hidden'}"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h3>${task.title}</h3>
                        </div>
                        <div class="task-actions">
                            <button class="icon-btn ${isBlocked ? 'hidden' : ''}" title="${task.is_completed ? 'Replay' : 'Focus Timer'}" onclick="startFocusMode(${task.id}, '${task.title.replace(/'/g, "\\'")}', ${task.estimated_minutes})">
                                ${task.is_completed 
                                    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
                                    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
                                }
                            </button>
                            <button class="icon-btn ${task.is_completed ? 'hidden' : ''}" title="Delete Task" onclick="deleteTask(${task.id})">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    ${microStepsHtml}
                </div>
            `;
            
            if (task.is_completed) {
                if (completedTaskList) completedTaskList.appendChild(taskCard);
            } else {
                if (taskList) taskList.appendChild(taskCard);
            }
            
            if (task.eisenhower_quadrant && !task.is_completed) {
                const matrixCard = taskCard.cloneNode(true);
                if (task.eisenhower_quadrant === 'Urgent & Important') q1?.appendChild(matrixCard);
                else if (task.eisenhower_quadrant === 'Important Not Urgent') q2?.appendChild(matrixCard);
                else if (task.eisenhower_quadrant === 'Urgent Not Important') q3?.appendChild(matrixCard);
                else if (task.eisenhower_quadrant === 'Neither') q4?.appendChild(matrixCard);
            }
        });
    }

    window.toggleTaskCompletion = async function(taskId) {
        try {
            await fetch(`/api/tasks/${taskId}/complete`, { method: 'PUT' });
            fetchTasks();
            fetchProfile();
        } catch (error) {
            console.error('Failed to toggle completion:', error);
        }
    };

    window.toggleMicrostep = async (stepId) => {
        try {
            await fetch(`/api/microsteps/${stepId}/complete`, { method: 'PUT' });
            fetchTasks();
            fetchProfile();
        } catch (error) {
            console.error("Error toggling microstep", error);
        }
    };

    // Eisenhower Matrix Logic
    const autoSortBtn = document.getElementById('auto-sort-btn');
    if (autoSortBtn) {
        autoSortBtn.addEventListener('click', async () => {
            const originalHTML = autoSortBtn.innerHTML;
            autoSortBtn.innerHTML = `<span>Sorting...</span><div class="spinner" id="sort-spinner"></div>`;
            autoSortBtn.disabled = true;
            
            try {
                const response = await fetch('/api/tasks/eisenhower-sort', { method: 'POST' });
                if (response.ok) {
                    fetchTasks();
                } else {
                    const err = await response.json();
                    handleApiError(response.status, err.detail);
                }
            } catch (e) {
                console.error(e);
            } finally {
                autoSortBtn.innerHTML = originalHTML;
                autoSortBtn.disabled = false;
            }
        });
    }

    // Schedule Generator Logic
    const genScheduleBtn = document.getElementById('generate-schedule-btn');
    if (genScheduleBtn) {
        genScheduleBtn.addEventListener('click', async () => {
            const spinner = document.getElementById('schedule-spinner');
            spinner.classList.remove('hidden');
            genScheduleBtn.disabled = true;
            try {
                const res = await fetch('/api/schedule/generate', { method: 'POST' });
                const data = await res.json();
                const timeline = document.getElementById('schedule-timeline');
                timeline.innerHTML = '';
                if (data.schedule && data.schedule.length > 0) {
                    data.schedule.forEach(item => {
                        timeline.innerHTML += `
                            <div class="schedule-item">
                                <div class="schedule-time">${item.start_time} - ${item.end_time}</div>
                                <div class="schedule-title">${item.title}</div>
                            </div>
                        `;
                    });
                } else {
                    timeline.innerHTML = '<p>No active tasks to schedule.</p>';
                }
            } catch (e) {
                console.error(e);
            } finally {
                spinner.classList.add('hidden');
                genScheduleBtn.disabled = false;
            }
        });
    }



    // Analytics Logic
    const generateAnalyticsBtn = document.getElementById('generate-analytics-btn');
    const analyticsContent = document.getElementById('analytics-content');
    const analyticsStats = document.getElementById('analytics-stats');
    const analyticsMarkdown = document.getElementById('analytics-markdown');
    
    if (generateAnalyticsBtn) {
        generateAnalyticsBtn.addEventListener('click', async () => {
            const originalHTML = generateAnalyticsBtn.innerHTML;
            generateAnalyticsBtn.innerHTML = `<span>Generating...</span><div class="spinner" id="analytics-spinner"></div>`;
            generateAnalyticsBtn.disabled = true;
            
            try {
                const response = await fetch('/api/analytics/weekly');
                if (response.ok) {
                    const data = await response.json();
                    analyticsStats.innerHTML = `Tasks Created: ${data.total_tasks} &nbsp;|&nbsp; Completed: ${data.completed_tasks} &nbsp;|&nbsp; Estimated Time: ${data.total_minutes}m`;
                    document.getElementById('analytics-markdown').innerHTML = marked.parse(data.review_markdown);
            
                    if (prodChart) prodChart.destroy();
                    const ctx = document.getElementById('productivity-chart').getContext('2d');
                    prodChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: data.chart_labels,
                            datasets: [{
                                label: 'Tasks Completed (Last 7 Days)',
                                data: data.chart_data,
                                borderColor: '#6366f1',
                                tension: 0.3,
                                fill: true,
                                backgroundColor: 'rgba(99, 102, 241, 0.2)'
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });

                    analyticsContent.classList.remove('hidden');
                } else {
                    const err = await response.json();
                    handleApiError(response.status, err.detail);
                }
            } catch (e) {
                console.error(e);
            } finally {
                generateAnalyticsBtn.innerHTML = originalHTML;
                generateAnalyticsBtn.disabled = false;
            }
        });
    }

    // Meeting Processor Logic
    const transcriptInput = document.getElementById('transcript-input');
    const summarizeBtn = document.getElementById('summarize-btn');
    const meetingSpinner = document.getElementById('meeting-spinner');
    const meetingResults = document.getElementById('meeting-results');
    const summaryText = document.getElementById('summary-text');
    const actionItemsList = document.getElementById('action-items-list');

    summarizeBtn.addEventListener('click', async () => {
        const transcript = transcriptInput.value.trim();
        if (!transcript) return;

        // UI State
        summarizeBtn.disabled = true;
        meetingSpinner.classList.remove('hidden');
        meetingResults.classList.add('hidden');

        try {
            const response = await fetch('/api/meetings/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Render Summary
                summaryText.textContent = data.summary;
                
                // Render Action Items
                actionItemsList.innerHTML = '';
                data.action_items_created.forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${item.title}</strong>: ${item.description} (${item.estimated_minutes}m)`;
                    actionItemsList.appendChild(li);
                });

                // Show results and refresh tasks view
                meetingResults.classList.remove('hidden');
                fetchTasks(); 
                
                transcriptInput.value = '';
            }
        } catch (error) {
            console.error(error);
        } finally {
            summarizeBtn.disabled = false;
            meetingSpinner.classList.add('hidden');
        }
    });

    // Global pause state for Solly integration
    let pausedBySolly = false;

    // Focus Mode Logic Elements
    const focusOverlay = document.getElementById('focus-overlay');
    const focusTaskTitle = document.getElementById('focus-task-title');
    const focusTimer = document.getElementById('focus-timer');
    const focusStartBtn = document.getElementById('focus-start-btn');
    const focusPauseBtn = document.getElementById('focus-pause-btn');
    const focusCancelBtn = document.getElementById('focus-cancel-btn');
    const focusSollyBtn = document.getElementById('focus-solly-btn');

    let focusInterval;
    let timeRemaining = 0; // in seconds
    let activeTaskId = null;

    // Solly Assistant Logic Elements
    const sollyToggle = document.getElementById('solly-toggle');
    const sollyWindow = document.getElementById('solly-window');
    const sollyClose = document.getElementById('solly-close');
    const sollyForm = document.getElementById('solly-form');
    const sollyInput = document.getElementById('solly-input');
    const sollyMessages = document.getElementById('solly-messages');
    const sollySendBtn = document.getElementById('solly-send');

    // --- Helper Functions ---
    function isFocusRunning() {
        return !focusOverlay.classList.contains('hidden') && !focusPauseBtn.classList.contains('hidden');
    }

    function pauseFocusTimer(bySolly = false) {
        clearInterval(focusInterval);
        focusPauseBtn.classList.add('hidden');
        focusStartBtn.classList.remove('hidden');
        if (bySolly) pausedBySolly = true;
    }

    function resumeFocusTimer() {
        if (!focusOverlay.classList.contains('hidden') && !focusStartBtn.classList.contains('hidden')) {
            focusStartBtn.click();
            pausedBySolly = false;
        }
    }

    window.askSollyAboutTask = function(taskTitle) {
        sollyWindow.classList.remove('hidden');
        sollyInput.value = `I need help with my task: "${taskTitle}". `;
        sollyInput.focus();
        if (isFocusRunning()) {
            pauseFocusTimer(true);
        }
    };

    // --- Solly Event Listeners ---
    sollyToggle.addEventListener('click', () => {
        sollyWindow.classList.toggle('hidden');
        if (!sollyWindow.classList.contains('hidden')) {
            sollyInput.focus();
            if (isFocusRunning()) {
                pauseFocusTimer(true);
            }
        } else {
            if (pausedBySolly) resumeFocusTimer();
        }
    });

    sollyClose.addEventListener('click', () => {
        sollyWindow.classList.add('hidden');
        if (pausedBySolly) resumeFocusTimer();
    });

    focusSollyBtn.addEventListener('click', () => {
        sollyWindow.classList.remove('hidden');
        sollyInput.value = `I need help with my task: "${focusTaskTitle.textContent}". `;
        sollyInput.focus();
        if (isFocusRunning()) {
            pauseFocusTimer(true);
        }
    });

    function scrollSollyToBottom() {
        sollyMessages.scrollTop = sollyMessages.scrollHeight;
    }

    function addSollyMessage(content, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        if (sender === 'user') {
            msgDiv.textContent = content;
        } else {
            msgDiv.innerHTML = content;
        }
        sollyMessages.appendChild(msgDiv);
        scrollSollyToBottom();
        return msgDiv;
    }

    sollyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = sollyInput.value.trim();
        if (!message) return;

        sollyInput.value = '';
        sollyInput.disabled = true;
        sollySendBtn.disabled = true;

        addSollyMessage(message, 'user');
        
        let currentTasks = [];
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) currentTasks = await res.json();
        } catch (e) {
            console.error(e);
        }

        const systemMessageContent = addSollyMessage('', 'system');
        
        try {
            const response = await fetch('/api/assistant/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, context_tasks: currentTasks })
            });

            if (!response.ok) throw new Error('Network error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulatedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        accumulatedText += line.slice(6);
                        systemMessageContent.innerHTML = marked.parse(accumulatedText);
                        scrollSollyToBottom();
                    }
                }
            }
        } catch (error) {
            systemMessageContent.textContent = "Error: Could not reach Solly.";
            console.error(error);
        } finally {
            sollyInput.disabled = false;
            sollySendBtn.disabled = false;
            sollyInput.focus();
            scrollSollyToBottom();
        }
    });

    // --- Focus Mode Logic Event Listeners ---
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // Voice Assistant Logic
    const micBtn = document.getElementById('mic-btn');
    let recognition;
    
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
    
        recognition.onstart = function() {
            micBtn.classList.add('recording');
        };
    
        recognition.onresult = async function(event) {
            const transcript = event.results[0][0].transcript;
            addSollyMessage(transcript, 'user');
            
            try {
                const response = await fetch('/api/assistant/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: transcript })
                });
                const data = await response.json();
                
                if (data.action_taken) {
                    addSollyMessage(data.message, 'system');
                    fetchTasks();
                } else {
                    addSollyMessage(data.message, 'system');
                }
            } catch (e) {
                console.error(e);
                addSollyMessage("Sorry, I encountered an error executing your command.", 'system');
            }
        };
    
        recognition.onerror = function(event) {
            console.error("Speech recognition error", event.error);
            micBtn.classList.remove('recording');
        };
    
        recognition.onend = function() {
            micBtn.classList.remove('recording');
        };
    
        micBtn.addEventListener('click', () => {
            if (micBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        if (micBtn) micBtn.style.display = 'none';
        console.warn("Speech recognition not supported in this browser.");
    }

    const focusLoading = document.getElementById('focus-loading');
    const focusMicrosteps = document.getElementById('focus-microsteps');
    let isBreak = false;

    window.startFocusMode = async function(taskId, title, minutes) {
        activeTaskId = taskId;
        timeRemaining = 15 * 60; // Enforce 15-minute interval
        isBreak = false;
        
        focusTaskTitle.innerHTML = title;
        focusTimer.textContent = formatTime(timeRemaining);
        focusMicrosteps.innerHTML = '';
        
        focusOverlay.classList.remove('hidden');
        focusStartBtn.classList.add('hidden'); // Hide start button until loaded
        focusPauseBtn.classList.add('hidden');
        focusLoading.classList.remove('hidden');
        pausedBySolly = false;

        try {
            const response = await fetch(`/api/tasks/${taskId}/pomodoro-breakdown`, { method: 'POST' });
            if (response.ok) {
                const steps = await response.json();
                renderFocusMicrosteps(steps);
            } else {
                const err = await response.json();
                handleApiError(response.status, err.detail);
                closeFocus(); // Close focus if error occurs
            }
        } catch (error) {
            console.error("Error breaking down pomodoro task", error);
        } finally {
            focusLoading.classList.add('hidden');
            focusStartBtn.classList.remove('hidden');
        }
    };

    function renderFocusMicrosteps(steps) {
        focusMicrosteps.innerHTML = '';
        steps.forEach(step => {
            const li = document.createElement('li');
            li.className = step.is_completed ? 'completed' : '';
            
            let linksHtml = '';
            if (step.resource_links) {
                try {
                    const links = JSON.parse(step.resource_links);
                    if (links && links.length > 0) {
                        linksHtml = '<div class="resource-links">';
                        links.forEach(link => {
                            let domain = link;
                            try { domain = new URL(link).hostname.replace('www.', ''); } catch(e) {}
                            linksHtml += `<a href="${link}" target="_blank" onclick="event.stopPropagation()">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                ${domain}
                            </a>`;
                        });
                        linksHtml += '</div>';
                    }
                } catch(e) { console.error('Error parsing links', e); }
            }

            li.innerHTML = `
                <div class="microstep-content">
                    <input type="checkbox" ${step.is_completed ? 'checked' : ''}>
                    <span>${step.title}</span>
                </div>
                ${linksHtml}
            `;
            
            li.addEventListener('click', async (e) => {
                if (e.target.closest('a')) return; // Ignore link clicks
                
                const cb = li.querySelector('input');
                if(e.target.tagName !== 'INPUT') {
                    cb.checked = !cb.checked;
                }
                li.classList.toggle('completed', cb.checked);
                try {
                    await fetch(`/api/microsteps/${step.id}/complete`, { method: 'PUT' });
                } catch(error) {
                    console.error("Error toggling microstep", error);
                }
            });
            focusMicrosteps.appendChild(li);
        });
    }

    focusStartBtn.addEventListener('click', () => {
        clearInterval(focusInterval); // Defensive clear
        focusStartBtn.classList.add('hidden');
        focusPauseBtn.classList.remove('hidden');
        pausedBySolly = false;

        focusInterval = setInterval(() => {
            timeRemaining--;
            focusTimer.textContent = formatTime(timeRemaining);

            if (timeRemaining <= 0) {
                clearInterval(focusInterval);
                
                if (!isBreak) {
                    alert("Pomodoro complete! Take a 5-minute break.");
                    isBreak = true;
                    timeRemaining = 5 * 60;
                    focusTimer.textContent = formatTime(timeRemaining);
                    focusStartBtn.classList.remove('hidden');
                    focusPauseBtn.classList.add('hidden');
                } else {
                    alert("Break over! Time to focus.");
                    isBreak = false;
                    timeRemaining = 15 * 60;
                    focusTimer.textContent = formatTime(timeRemaining);
                    focusStartBtn.classList.remove('hidden');
                    focusPauseBtn.classList.add('hidden');
                }
            }
        }, 1000);
    });

    focusPauseBtn.addEventListener('click', () => pauseFocusTimer(false));
    focusCancelBtn.addEventListener('click', closeFocus);

    function closeFocus() {
        clearInterval(focusInterval);
        focusOverlay.classList.add('hidden');
        activeTaskId = null;
        pausedBySolly = false;
    }
});

