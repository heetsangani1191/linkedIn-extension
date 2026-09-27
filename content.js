/**
 * LinkedIn Network Assistant - Content Script Bridge & Coordinator
 * Receives commands from popup/background, injects floating UI, and runs safety/action loops.
 */

(function () {
  const Assistant = window.LinkedInAssistant;
  if (!Assistant) {
    console.error('[LinkedIn Network Assistant] Core modules missing.');
    return;
  }

  console.log('[LinkedIn Network Assistant] Content script initialized on:', window.location.href);

  // Initialize MutationObserver scanner for live count updates
  Assistant.Scanner.startObserver((buttons) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
    if (Assistant.FloatingPanel) {
      Assistant.FloatingPanel.updateData();
    }
  });

  // Listen for messages from extension popup or service worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request).then(sendResponse);
    return true; // Async response
  });

  async function handleMessage(request) {
    const { ActionManager, Scanner, Detector, FloatingPanel, Storage, SafetyManager } = Assistant;

    switch (request.action) {
      case 'SCAN_PAGE': {
        const mode = request.mode || (ActionManager.getMode ? ActionManager.getMode() : 'CONNECT');
        const scanResult = Scanner.scanPage();
        const settings = await Storage.getSettings();
        const allButtons = mode === 'LIKE' ? Detector.findLikeButtons(true) : Detector.findConnectButtons(true);
        if (settings.testMode) {
          Detector.highlightButtons(allButtons, true, mode === 'LIKE' ? 'Like Button' : 'Connect Button');
        }
        return {
          success: true,
          detectedCount: allButtons.length,
          totalCards: scanResult.totalCards,
          url: scanResult.url,
          mode,
          state: ActionManager.getState()
        };
      }

      case 'START_ASSISTANT': {
        FloatingPanel.initPanel();
        const mode = request.mode || 'CONNECT';
        const startRes = await ActionManager.startAutomation(mode);
        return startRes;
      }

      case 'PAUSE_ASSISTANT': {
        ActionManager.pauseAutomation();
        return { success: true, message: 'Paused' };
      }

      case 'RESUME_ASSISTANT': {
        ActionManager.resumeAutomation();
        return { success: true, message: 'Resumed' };
      }

      case 'STOP_ASSISTANT': {
        ActionManager.stopAutomation(request.reason || 'Stopped by user.');
        return { success: true, message: 'Stopped' };
      }

      case 'GET_STATUS': {
        const mode = request.mode || (ActionManager.getMode ? ActionManager.getMode() : 'CONNECT');
        const settings = await Storage.getSettings();
        const stats = await Storage.getStats();
        const allButtons = mode === 'LIKE' ? Detector.findLikeButtons(true) : Detector.findConnectButtons(true);
        const safety = SafetyManager.checkSafety();
        const runStats = ActionManager.getRunStats();

        return {
          success: true,
          state: ActionManager.getState(),
          mode: ActionManager.getMode ? ActionManager.getMode() : mode,
          statusMessage: ActionManager.getStatusMessage(),
          detectedCount: allButtons.length,
          runStats,
          stats,
          settings,
          safety
        };
      }

      case 'UPDATE_SETTINGS': {
        const updated = await Storage.saveSettings(request.settings);
        if (updated.testMode) {
          const buttons = Detector.findConnectButtons();
          Detector.highlightButtons(buttons, true);
        } else {
          const buttons = Detector.findConnectButtons();
          Detector.highlightButtons(buttons, false);
        }
        return { success: true, settings: updated };
      }

      case 'CLEAR_LOG': {
        await Storage.clearLogs();
        return { success: true };
      }

      case 'TOGGLE_FLOATING_PANEL': {
        if (request.show) {
          FloatingPanel.initPanel();
        } else {
          FloatingPanel.removePanel();
        }
        return { success: true };
      }

      default:
        return { success: false, message: `Unknown action: ${request.action}` };
    }
  }
})();
