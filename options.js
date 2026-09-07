/**
 * LinkedIn Network Assistant - Options Page Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const optBatchSize = document.getElementById('opt-batch-size');
  const optMaxActions = document.getElementById('opt-max-actions');
  const optMinDelay = document.getElementById('opt-min-delay');
  const optMaxDelay = document.getElementById('opt-max-delay');

  const optAutoScroll = document.getElementById('opt-auto-scroll');
  const optConfirmBatch = document.getElementById('opt-confirm-batch');
  const optAutoConfirmDialogs = document.getElementById('opt-auto-confirm-dialogs');
  const optStopWarning = document.getElementById('opt-stop-warning');
  const optTestMode = document.getElementById('opt-test-mode');

  const btnSave = document.getElementById('btn-save-options');
  const btnRestore = document.getElementById('btn-restore-defaults');
  const saveStatus = document.getElementById('save-status');

  const DEFAULT_SETTINGS = {
    batchSize: 5,
    maxActions: 20,
    minDelay: 3,
    maxDelay: 7,
    autoScroll: true,
    confirmBeforeBatch: true,
    autoConfirmDialogs: false,
    stopOnWarning: true,
    testMode: false
  };

  function loadSettings() {
    chrome.storage.local.get(['settings'], result => {
      const s = Object.assign({}, DEFAULT_SETTINGS, result.settings || {});
      optBatchSize.value = s.batchSize;
      optMaxActions.value = s.maxActions;
      optMinDelay.value = s.minDelay;
      optMaxDelay.value = s.maxDelay;

      optAutoScroll.checked = s.autoScroll;
      optConfirmBatch.checked = s.confirmBeforeBatch;
      optAutoConfirmDialogs.checked = s.autoConfirmDialogs;
      optStopWarning.checked = true; // Locked ON
      optTestMode.checked = s.testMode;
    });
  }

  btnSave.addEventListener('click', () => {
    const updated = {
      batchSize: parseInt(optBatchSize.value, 10) || 5,
      maxActions: parseInt(optMaxActions.value, 10) || 20,
      minDelay: parseInt(optMinDelay.value, 10) || 3,
      maxDelay: parseInt(optMaxDelay.value, 10) || 7,
      autoScroll: optAutoScroll.checked,
      confirmBeforeBatch: optConfirmBatch.checked,
      autoConfirmDialogs: optAutoConfirmDialogs.checked,
      stopOnWarning: true, // Locked ON
      testMode: optTestMode.checked
    };

    chrome.storage.local.get(['settings'], result => {
      const merged = Object.assign({}, result.settings || {}, updated);
      chrome.storage.local.set({ settings: merged }, () => {
        saveStatus.textContent = 'Settings saved successfully!';
        setTimeout(() => { saveStatus.textContent = ''; }, 3000);
      });
    });
  });

  btnRestore.addEventListener('click', () => {
    if (confirm('Restore default settings?')) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS }, () => {
        loadSettings();
        saveStatus.textContent = 'Restored defaults.';
        setTimeout(() => { saveStatus.textContent = ''; }, 3000);
      });
    }
  });

  loadSettings();
});
