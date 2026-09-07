/**
 * LinkedIn Network Assistant - Popup UI Controller
 * Manages tabs, settings sync, message dispatching, and dynamic UI updates.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  const firstRunModal = document.getElementById('first-run-modal');
  const btnFirstRunAgree = document.getElementById('btn-first-run-agree');

  // Connect tab inputs
  const currentPageEl = document.getElementById('connect-current-page');
  const detectedCountEl = document.getElementById('connect-detected-count');
  const inputBatchSize = document.getElementById('input-batch-size');
  const inputMaxActions = document.getElementById('input-max-actions');
  const inputMinDelay = document.getElementById('input-min-delay');
  const inputMaxDelay = document.getElementById('input-max-delay');
  const chkAutoScroll = document.getElementById('chk-auto-scroll');
  const chkConfirmBatch = document.getElementById('chk-confirm-batch');
  const chkSafetyAck = document.getElementById('chk-safety-ack');
  const chkTestMode = document.getElementById('chk-test-mode');

  // Action buttons
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');

  // Metrics
  const progressFill = document.getElementById('progress-fill');
  const metricProcessed = document.getElementById('metric-processed');
  const metricConnected = document.getElementById('metric-connected');
  const metricSkipped = document.getElementById('metric-skipped');
  const metricErrors = document.getElementById('metric-errors');
  const statusBannerText = document.getElementById('status-banner-text');

  // Header status
  const headerStatusDot = document.getElementById('header-status-dot');
  const headerStatusText = document.getElementById('header-status-text');

  // Stats tab
  const statDetected = document.getElementById('stat-detected');
  const statProcessed = document.getElementById('stat-processed');
  const statSuccessful = document.getElementById('stat-successful');
  const statSkipped = document.getElementById('stat-skipped');
  const statErrors = document.getElementById('stat-errors');
  const statStopped = document.getElementById('stat-stopped');
  const statDuration = document.getElementById('stat-duration');
  const statPage = document.getElementById('stat-page');
  const statLastAction = document.getElementById('stat-last-action');
  const btnResetStats = document.getElementById('btn-reset-stats');

  // Scanner tab
  const scanTotalCards = document.getElementById('scan-total-cards');
  const scanEligibleButtons = document.getElementById('scan-eligible-buttons');
  const btnRescanPage = document.getElementById('btn-rescan-page');

  // Logs tab
  const logList = document.getElementById('log-list');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  // Debug tab
  const debugUrl = document.getElementById('debug-url');
  const debugCards = document.getElementById('debug-cards');
  const debugButtons = document.getElementById('debug-buttons');
  const debugProcessed = document.getElementById('debug-processed');
  const debugState = document.getElementById('debug-state');
  const debugError = document.getElementById('debug-error');
  const btnDebugRefresh = document.getElementById('btn-debug-refresh');

  let activeTabId = null;

  // TAB NAVIGATION
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.add('hidden'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.remove('hidden');

      if (targetId === 'tab-logs') refreshLogs();
      if (targetId === 'tab-stats') refreshStats();
      if (targetId === 'tab-debug' || targetId === 'tab-scanner') triggerPageScan();
    });
  });

  // GET ACTIVE LINKEDIN TAB
  async function getActiveLinkedInTab() {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          activeTabId = tabs[0].id;
          resolve(tabs[0]);
        } else {
          resolve(null);
        }
      });
    });
  }

  // SEND MESSAGE TO CONTENT SCRIPT (WITH AUTO-INJECTION FALLBACK)
  async function sendMessageToTab(action, payload = {}) {
    const tab = await getActiveLinkedInTab();
    if (!tab) {
      return { success: false, message: 'Please open LinkedIn page first.' };
    }
    const targetUrl = tab.url || tab.pendingUrl || '';
    if (!targetUrl.includes('linkedin.com')) {
      return { success: false, message: 'Please open LinkedIn page first.' };
    }

    return new Promise(resolve => {
      chrome.tabs.sendMessage(tab.id, { action, ...payload }, response => {
        if (chrome.runtime.lastError) {
          // Content script not loaded yet (tab opened prior to extension load) -> auto-inject
          chrome.runtime.sendMessage({ action: 'INJECT_CONTENT_SCRIPTS', tabId: tab.id }, injectRes => {
            if (injectRes && injectRes.success) {
              // Retry sending message after short delay
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action, ...payload }, retryRes => {
                  resolve(retryRes || { success: false, message: 'Retried after injection.' });
                });
              }, 300);
            } else {
              resolve({ success: false, message: 'Content script not loaded on this tab. Please refresh the page (F5).' });
            }
          });
        } else {
          resolve(response || { success: false });
        }
      });
    });
  }

  // LOAD SETTINGS FROM STORAGE
  chrome.storage.local.get(['settings', 'stats'], result => {
    const settings = result.settings || {};

    if (!settings.acknowledgedDisclaimer) {
      firstRunModal.classList.remove('hidden');
    }

    inputBatchSize.value = settings.batchSize || 5;
    inputMaxActions.value = settings.maxActions || 20;
    inputMinDelay.value = settings.minDelay || 3;
    inputMaxDelay.value = settings.maxDelay || 7;
    chkAutoScroll.checked = settings.autoScroll !== false;
    chkConfirmBatch.checked = settings.confirmBeforeBatch !== false;
    chkTestMode.checked = settings.testMode || false;
    chkSafetyAck.checked = settings.acknowledgedDisclaimer || false;

    updateStartButtonState();
  });

  // DISCLAIMER & SAFETY ACKNOWLEDGMENT
  btnFirstRunAgree.addEventListener('click', () => {
    firstRunModal.classList.add('hidden');
    chkSafetyAck.checked = true;
    saveCurrentFormSettings({ acknowledgedDisclaimer: true });
    updateStartButtonState();
  });

  chkSafetyAck.addEventListener('change', () => {
    saveCurrentFormSettings({ acknowledgedDisclaimer: chkSafetyAck.checked });
    updateStartButtonState();
  });

  function updateStartButtonState() {
    btnStart.disabled = !chkSafetyAck.checked;
  }

  // SAVE SETTINGS ON INPUT CHANGE
  function saveCurrentFormSettings(extra = {}) {
    const newSettings = {
      batchSize: parseInt(inputBatchSize.value, 10) || 5,
      maxActions: parseInt(inputMaxActions.value, 10) || 20,
      minDelay: parseInt(inputMinDelay.value, 10) || 3,
      maxDelay: parseInt(inputMaxDelay.value, 10) || 7,
      autoScroll: chkAutoScroll.checked,
      confirmBeforeBatch: chkConfirmBatch.checked,
      testMode: chkTestMode.checked,
      acknowledgedDisclaimer: chkSafetyAck.checked,
      ...extra
    };

    chrome.storage.local.get(['settings'], res => {
      const updated = Object.assign({}, res.settings || {}, newSettings);
      chrome.storage.local.set({ settings: updated });
      sendMessageToTab('UPDATE_SETTINGS', { settings: updated });
    });
  }

  [inputBatchSize, inputMaxActions, inputMinDelay, inputMaxDelay].forEach(input => {
    input.addEventListener('change', () => saveCurrentFormSettings());
  });

  [chkAutoScroll, chkConfirmBatch, chkTestMode].forEach(chk => {
    chk.addEventListener('change', () => saveCurrentFormSettings());
  });

  // ACTION BUTTON HANDLERS
  btnStart.addEventListener('click', async () => {
    saveCurrentFormSettings();
    const res = await sendMessageToTab('START_ASSISTANT');
    if (!res.success) {
      statusBannerText.textContent = res.message || 'Could not start assistant.';
    } else {
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;
    }
  });

  btnPause.addEventListener('click', async () => {
    const isPaused = btnPause.textContent === 'Resume';
    const action = isPaused ? 'RESUME_ASSISTANT' : 'PAUSE_ASSISTANT';
    const res = await sendMessageToTab(action);
    if (res.success) {
      btnPause.textContent = isPaused ? 'Pause' : 'Resume';
    }
  });

  btnStop.addEventListener('click', async () => {
    await sendMessageToTab('STOP_ASSISTANT', { reason: 'Stopped from popup.' });
    btnStart.disabled = !chkSafetyAck.checked;
    btnPause.disabled = true;
    btnStop.disabled = true;
    btnPause.textContent = 'Pause';
  });

  // RESET STATS
  btnResetStats.addEventListener('click', () => {
    chrome.storage.local.set({
      stats: {
        detected: 0,
        processed: 0,
        connected: 0,
        skipped: 0,
        errors: 0,
        stopped: 0,
        sessionStartTime: Date.now(),
        lastActionTime: null,
        lastActionText: 'Reset'
      }
    }, () => refreshStats());
  });

  // CLEAR LOGS
  btnClearLogs.addEventListener('click', async () => {
    await sendMessageToTab('CLEAR_LOG');
    refreshLogs();
  });

  // RESCAN / REFRESH DOM
  btnRescanPage.addEventListener('click', () => triggerPageScan());
  btnDebugRefresh.addEventListener('click', () => triggerPageScan());

  async function triggerPageScan() {
    const res = await sendMessageToTab('SCAN_PAGE');
    if (res && res.success) {
      scanTotalCards.textContent = res.totalCards || 0;
      scanEligibleButtons.textContent = res.detectedCount || 0;
      connectPageUpdate(res.url, res.detectedCount);

      debugUrl.textContent = res.url || 'Not LinkedIn';
      debugCards.textContent = res.totalCards || 0;
      debugButtons.textContent = res.detectedCount || 0;
      debugState.textContent = res.state || 'IDLE';
    } else {
      const tab = await getActiveLinkedInTab();
      const url = (tab && (tab.url || tab.pendingUrl)) || '';
      if (url.includes('linkedin.com')) {
        connectPageUpdate(url, 0);
      } else {
        currentPageEl.textContent = 'Not on LinkedIn page';
        detectedCountEl.textContent = '0';
      }
    }
  }

  function connectPageUpdate(url, count) {
    if (url) {
      const cleanUrl = url.replace('https://www.', '').replace('https://', '');
      currentPageEl.textContent = cleanUrl;
      currentPageEl.title = url;
    }
    detectedCountEl.textContent = count || 0;
  }

  // REFRESH LOGS
  function refreshLogs() {
    chrome.storage.local.get(['activityLogs'], res => {
      const logs = res.activityLogs || [];
      if (logs.length === 0) {
        logList.innerHTML = '<div class="log-empty">No activity recorded yet.</div>';
        return;
      }

      logList.innerHTML = logs.map(l => `
        <div class="log-item">
          <span class="log-time">${l.timestamp}</span>
          <span class="log-tag tag-${l.type}">${l.type}</span>
          <span>${l.message}</span>
        </div>
      `).join('');
    });
  }

  // REFRESH STATS
  function refreshStats() {
    chrome.storage.local.get(['stats'], res => {
      const s = res.stats || {};
      statDetected.textContent = s.detected || 0;
      statProcessed.textContent = s.processed || 0;
      statSuccessful.textContent = s.connected || 0;
      statSkipped.textContent = s.skipped || 0;
      statErrors.textContent = s.errors || 0;
      statStopped.textContent = s.stopped || 0;
      statLastAction.textContent = s.lastActionText || 'None';

      if (s.sessionStartTime) {
        const diffMs = Date.now() - s.sessionStartTime;
        const totalSec = Math.floor(diffMs / 1000);
        const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSec % 60).padStart(2, '0');
        statDuration.textContent = `${hrs}:${mins}:${secs}`;
      } else {
        statDuration.textContent = '00:00:00';
      }
    });
  }

  // MAIN STATUS POLLING LOOP
  async function pollStatus() {
    const tab = await getActiveLinkedInTab();
    const currentUrl = (tab && (tab.url || tab.pendingUrl)) || '';

    const statusRes = await sendMessageToTab('GET_STATUS');

    if (statusRes && statusRes.success) {
      const { state, statusMessage, detectedCount, runStats, settings } = statusRes;

      connectPageUpdate(currentUrl, detectedCount);
      statusBannerText.textContent = statusMessage || 'Ready';

      // Update Header Badge
      headerStatusText.textContent = state;
      if (state === 'PROCESSING') {
        headerStatusDot.style.color = '#057642';
      } else if (state === 'PAUSED' || state === 'WAITING_CONFIRMATION' || state === 'WAITING_DIALOG') {
        headerStatusDot.style.color = '#E6A23C';
      } else if (state === 'SAFETY_STOP' || state === 'STOPPED') {
        headerStatusDot.style.color = '#CC1010';
      } else {
        headerStatusDot.style.color = '#0A66C2';
      }

      // Update Metrics
      if (runStats) {
        metricProcessed.textContent = runStats.processed;
        metricConnected.textContent = runStats.connected;
        metricSkipped.textContent = runStats.skipped;
        metricErrors.textContent = runStats.errors;

        const maxActions = (settings && settings.maxActions) ? settings.maxActions : 20;
        const pct = Math.min(100, Math.round((runStats.processed / maxActions) * 100));
        progressFill.style.width = `${pct}%`;
      }

      // Control Buttons state
      if (state === 'PROCESSING' || state === 'SCROLLING') {
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnStop.disabled = false;
        btnPause.textContent = 'Pause';
      } else if (state === 'PAUSED') {
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnStop.disabled = false;
        btnPause.textContent = 'Resume';
      } else {
        btnStart.disabled = !chkSafetyAck.checked;
        btnPause.disabled = true;
        btnStop.disabled = true;
        btnPause.textContent = 'Pause';
      }
    } else {
      if (currentUrl.includes('linkedin.com')) {
        headerStatusText.textContent = 'Ready';
        headerStatusDot.style.color = '#0A66C2';
        connectPageUpdate(currentUrl, 0);
      } else {
        headerStatusText.textContent = 'Not on LinkedIn';
        headerStatusDot.style.color = '#777777';
        currentPageEl.textContent = 'Open LinkedIn Page';
      }
    }
  }

  // Initial load & periodic refresh
  triggerPageScan();
  pollStatus();
  setInterval(pollStatus, 1000);
});
