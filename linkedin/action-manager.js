/**
 * LinkedIn Network Assistant - Action Manager & State Machine Module
 * Manages automation lifecycle, batch processing, delays, and state transitions.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.ActionManager = (function () {
  // Automation States
  const STATES = {
    IDLE: 'IDLE',
    SCANNING: 'SCANNING',
    WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
    PROCESSING: 'PROCESSING',
    WAITING_DIALOG: 'WAITING_DIALOG',
    SCROLLING: 'SCROLLING',
    PAUSED: 'PAUSED',
    STOPPED: 'STOPPED',
    COMPLETED: 'COMPLETED',
    SAFETY_STOP: 'SAFETY_STOP'
  };

  let currentState = STATES.IDLE;
  let currentBatch = [];
  let totalProcessedInRun = 0;
  let totalConnectedInRun = 0;
  let totalSkippedInRun = 0;
  let totalErrorsInRun = 0;
  let activeRunSettings = null;
  let statusMessage = 'Ready';
  let stateListeners = [];

  function getState() {
    return currentState;
  }

  function getStatusMessage() {
    return statusMessage;
  }

  function addStateListener(listener) {
    if (typeof listener === 'function') {
      stateListeners.push(listener);
    }
  }

  function setState(newState, message = '') {
    currentState = newState;
    if (message) statusMessage = message;
    stateListeners.forEach(fn => fn(currentState, statusMessage));

    // Update Chrome extension badge if running or paused
    if (chrome.runtime && chrome.runtime.sendMessage) {
      let badgeText = '';
      let badgeColor = '#0A66C2';

      if (newState === STATES.PROCESSING) {
        badgeText = 'RUN';
        badgeColor = '#057642';
      } else if (newState === STATES.PAUSED || newState === STATES.WAITING_CONFIRMATION || newState === STATES.WAITING_DIALOG) {
        badgeText = 'PAUSE';
        badgeColor = '#E6A23C';
      } else if (newState === STATES.SAFETY_STOP || newState === STATES.STOPPED) {
        badgeText = 'STOP';
        badgeColor = '#CC1010';
      }

      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', badgeText, badgeColor }).catch(() => {});
    }
  }

  /**
   * Helper to wait with safety check polling
   */
  async function safeWait(seconds) {
    const ms = seconds * 1000;
    const interval = 250;
    let elapsed = 0;

    while (elapsed < ms) {
      if (currentState === STATES.STOPPED || currentState === STATES.SAFETY_STOP) {
        throw new Error('STOPPED_BY_USER');
      }
      while (currentState === STATES.PAUSED || currentState === STATES.WAITING_DIALOG) {
        await new Promise(r => setTimeout(r, 200));
        if (currentState === STATES.STOPPED || currentState === STATES.SAFETY_STOP) {
          throw new Error('STOPPED_BY_USER');
        }
      }
      await new Promise(r => setTimeout(r, interval));
      elapsed += interval;

      // Periodic safety check during long delay
      const safety = window.LinkedInAssistant.SafetyManager.checkSafety();
      if (!safety.safe) {
        setState(STATES.SAFETY_STOP, safety.reason);
        await window.LinkedInAssistant.Storage.addLog(safety.reason, 'WARNING');
        throw new Error(`SAFETY_STOP: ${safety.reason}`);
      }
    }
  }

  /**
   * Calculate random human-like delay between min and max seconds
   */
  function getRandomDelay(minSec, maxSec) {
    const min = Math.max(1, minSec || 3);
    const max = Math.max(min, maxSec || 7);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Start Automation Task
   */
  async function startAutomation() {
    const Storage = window.LinkedInAssistant.Storage;
    const Detector = window.LinkedInAssistant.Detector;
    const SafetyManager = window.LinkedInAssistant.SafetyManager;

    if (currentState === STATES.PROCESSING || currentState === STATES.WAITING_CONFIRMATION) {
      return { success: false, message: 'Automation is already running.' };
    }

    // Safety check first
    const safety = SafetyManager.checkSafety();
    if (!safety.safe) {
      setState(STATES.SAFETY_STOP, safety.reason);
      await Storage.addLog(`Automation start blocked: ${safety.reason}`, 'WARNING');
      return { success: false, message: safety.reason };
    }

    activeRunSettings = await Storage.getSettings();

    // Verify user acknowledged limits
    if (!activeRunSettings.acknowledgedDisclaimer) {
      return { success: false, message: 'Please accept the disclaimer before starting.' };
    }

    totalProcessedInRun = 0;
    totalConnectedInRun = 0;
    totalSkippedInRun = 0;
    totalErrorsInRun = 0;

    // Reset processed tracking for a fresh run
    Detector.resetProcessedSet();

    setState(STATES.SCANNING, 'Scanning page for Connect buttons...');
    await Storage.addLog('Started automation scan', 'INFO');

    const buttons = Detector.findConnectButtons();
    if (buttons.length === 0) {
      if (activeRunSettings.autoScroll) {
        setState(STATES.SCROLLING, 'No visible Connect buttons found. Scrolling page...');
        const scrollRes = await window.LinkedInAssistant.ScrollManager.scrollAndLoadMore((msg) => setState(STATES.SCROLLING, msg));
        if (scrollRes.stoppedNoNew || scrollRes.totalButtons.length === 0) {
          setState(STATES.COMPLETED, 'No Connect buttons found on page.');
          await Storage.addLog('No Connect buttons found on page.', 'WARNING');
          return { success: true, message: 'No Connect buttons found.' };
        }
      } else {
        setState(STATES.COMPLETED, 'No visible Connect buttons found.');
        await Storage.addLog('No Connect buttons found on page.', 'WARNING');
        return { success: true, message: 'No Connect buttons found.' };
      }
    }

    runNextBatch();
    return { success: true, message: 'Automation started.' };
  }

  /**
   * Process next batch of connection requests
   */
  async function runNextBatch() {
    const Storage = window.LinkedInAssistant.Storage;
    const Detector = window.LinkedInAssistant.Detector;
    const SafetyManager = window.LinkedInAssistant.SafetyManager;
    const DialogHandler = window.LinkedInAssistant.DialogHandler;

    try {
      const allButtons = Detector.findConnectButtons();
      const remainingAllowed = activeRunSettings.maxActions - totalProcessedInRun;

      if (remainingAllowed <= 0) {
        setState(STATES.COMPLETED, 'Maximum action limit reached.');
        await Storage.addLog(`Reached maximum action limit (${activeRunSettings.maxActions}).`, 'INFO');
        return;
      }

      const batchCount = Math.min(activeRunSettings.batchSize, remainingAllowed, allButtons.length);

      if (batchCount <= 0) {
        if (activeRunSettings.autoScroll) {
          setState(STATES.SCROLLING, 'Batch finished. Scrolling for more profiles...');
          const scrollRes = await window.LinkedInAssistant.ScrollManager.scrollAndLoadMore((msg) => setState(STATES.SCROLLING, msg));
          if (scrollRes.stoppedNoNew) {
            setState(STATES.COMPLETED, 'No additional Connect buttons were found.');
            await Storage.addLog('No additional Connect buttons found after scrolling.', 'INFO');
            return;
          } else {
            runNextBatch();
            return;
          }
        } else {
          setState(STATES.COMPLETED, 'Completed processing available Connect buttons.');
          await Storage.addLog('Completed processing available buttons.', 'INFO');
          return;
        }
      }

      currentBatch = allButtons.slice(0, batchCount);

      // Batch confirmation check if enabled
      if (activeRunSettings.confirmBeforeBatch && totalProcessedInRun === 0) {
        setState(STATES.WAITING_CONFIRMATION, `Ready to process ${currentBatch.length} connection requests.`);
        if (window.LinkedInAssistant.Modal) {
          window.LinkedInAssistant.Modal.showBatchConfirmModal(currentBatch.length, () => {
            executeBatchProcessing();
          }, () => {
            stopAutomation('Cancelled by user before batch.');
          });
        } else {
          executeBatchProcessing();
        }
        return;
      }

      await executeBatchProcessing();

    } catch (err) {
      if (err.message === 'STOPPED_BY_USER' || err.message.startsWith('SAFETY_STOP')) {
        return;
      }
      console.error('[LinkedIn Network Assistant] Batch error:', err);
      totalErrorsInRun++;
      await Storage.addLog(`Error in automation: ${err.message}`, 'ERROR');
      setState(STATES.PAUSED, `Error encountered: ${err.message}`);
    }
  }

  /**
   * Execute connection clicks for current batch
   */
  async function executeBatchProcessing() {
    const Storage = window.LinkedInAssistant.Storage;
    const Detector = window.LinkedInAssistant.Detector;
    const SafetyManager = window.LinkedInAssistant.SafetyManager;
    const DialogHandler = window.LinkedInAssistant.DialogHandler;

    setState(STATES.PROCESSING, `Processing batch (0/${currentBatch.length})...`);

    for (let i = 0; i < currentBatch.length; i++) {
      if (currentState === STATES.STOPPED || currentState === STATES.SAFETY_STOP) break;

      const button = currentBatch[i];
      if (Detector.isProcessed(button)) {
        totalSkippedInRun++;
        continue;
      }

      // 1. Safety Check
      const safety = SafetyManager.checkSafety();
      if (!safety.safe) {
        setState(STATES.SAFETY_STOP, safety.reason);
        await Storage.addLog(safety.reason, 'WARNING');
        return;
      }

      // 2. Scroll into view
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 3. Human-like delay
      const delay = getRandomDelay(activeRunSettings.minDelay, activeRunSettings.maxDelay);
      setState(STATES.PROCESSING, `Waiting ${delay}s before action (${i + 1}/${currentBatch.length})...`);
      await safeWait(delay);

      // 4. Perform click or Test Mode highlight
      if (activeRunSettings.testMode) {
        Detector.highlightButtons([button], true);
        Detector.markProcessed(button);
        totalConnectedInRun++;
        totalProcessedInRun++;
        await Storage.addLog(`[TEST MODE] Highlighted Connect button #${totalProcessedInRun}`, 'SUCCESS');
        await Storage.updateStats({
          processed: totalProcessedInRun,
          connected: totalConnectedInRun,
          lastActionTime: Date.now(),
          lastActionText: `[TEST MODE] Highlighted button #${totalProcessedInRun}`
        });
      } else {
        try {
          button.click();
          Detector.markProcessed(button);
          await safeWait(1.5); // wait for UI response

          // 5. Handle post-click confirmation dialog
          const dialogResult = await DialogHandler.handleDialog(activeRunSettings.autoConfirmDialogs);
          if (dialogResult.requiresUserConfirmation) {
            setState(STATES.WAITING_DIALOG, 'LinkedIn is asking for confirmation.');
            await Storage.addLog('LinkedIn is asking for connection confirmation.', 'WARNING');

            if (window.LinkedInAssistant.Modal) {
              window.LinkedInAssistant.Modal.showDialogPromptModal(
                async () => { // Continue
                  const sendBtn = DialogHandler.findSendWithoutNoteButton(dialogResult.dialogElement);
                  if (sendBtn) sendBtn.click();
                  setState(STATES.PROCESSING, 'Resuming batch...');
                  await executePostClickSuccess(totalProcessedInRun + 1);
                },
                () => { // Stop
                  stopAutomation('Stopped at confirmation prompt.');
                }
              );
              return;
            }
          }

          await executePostClickSuccess(totalProcessedInRun + 1);
        } catch (err) {
          console.error('Click error:', err);
          totalErrorsInRun++;
          await Storage.addLog(`Failed to click Connect button: ${err.message}`, 'ERROR');
        }
      }

      setState(STATES.PROCESSING, `Processed ${i + 1}/${currentBatch.length} in current batch.`);
    }

    // Batch completed check
    if (currentState === STATES.PROCESSING) {
      if (totalProcessedInRun >= activeRunSettings.maxActions) {
        setState(STATES.COMPLETED, 'Maximum action limit reached.');
        await Storage.addLog(`Finished run. Processed ${totalProcessedInRun} connections.`, 'SUCCESS');
      } else if (activeRunSettings.autoScroll) {
        setState(STATES.SCROLLING, 'Batch finished. Scrolling page for more profiles...');
        const scrollRes = await window.LinkedInAssistant.ScrollManager.scrollAndLoadMore((msg) => setState(STATES.SCROLLING, msg));
        if (scrollRes.stoppedNoNew) {
          setState(STATES.COMPLETED, 'No additional Connect buttons were found.');
          await Storage.addLog('No additional Connect buttons found after scrolling.', 'INFO');
        } else {
          runNextBatch();
        }
      } else {
        setState(STATES.COMPLETED, 'Batch complete.');
        await Storage.addLog(`Batch completed. Total processed: ${totalProcessedInRun}.`, 'SUCCESS');
      }
    }
  }

  async function executePostClickSuccess(count) {
    const Storage = window.LinkedInAssistant.Storage;
    totalConnectedInRun++;
    totalProcessedInRun = count;
    await Storage.addLog(`Sent connection request #${totalProcessedInRun}`, 'SUCCESS');
    await Storage.updateStats({
      processed: totalProcessedInRun,
      connected: totalConnectedInRun,
      lastActionTime: Date.now(),
      lastActionText: `Connected #${totalProcessedInRun}`
    });
  }

  function pauseAutomation() {
    if (currentState === STATES.PROCESSING || currentState === STATES.SCROLLING) {
      setState(STATES.PAUSED, 'Automation paused by user.');
      window.LinkedInAssistant.Storage.addLog('Automation paused by user.', 'INFO');
    }
  }

  function resumeAutomation() {
    if (currentState === STATES.PAUSED) {
      setState(STATES.PROCESSING, 'Resuming automation...');
      window.LinkedInAssistant.Storage.addLog('Automation resumed by user.', 'INFO');
      runNextBatch();
    }
  }

  function stopAutomation(reason = 'Stopped by user.') {
    setState(STATES.STOPPED, reason);
    window.LinkedInAssistant.ScrollManager.stopScroll();
    window.LinkedInAssistant.Storage.addLog(`Automation stopped: ${reason}`, 'STOPPED');
  }

  return {
    STATES,
    getState,
    getStatusMessage,
    addStateListener,
    startAutomation,
    pauseAutomation,
    resumeAutomation,
    stopAutomation,
    getRunStats: () => ({
      processed: totalProcessedInRun,
      connected: totalConnectedInRun,
      skipped: totalSkippedInRun,
      errors: totalErrorsInRun
    })
  };
})();
