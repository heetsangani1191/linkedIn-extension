/**
 * LinkedIn Network Assistant - Service Worker (Background Script)
 * Manifest V3 Service Worker managing lifecycle, tab events, and cross-component messaging.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[LinkedIn Network Assistant] Extension installed.');
    chrome.storage.local.set({
      settings: {
        batchSize: 5,
        maxActions: 20,
        minDelay: 3,
        maxDelay: 7,
        autoScroll: true,
        confirmBeforeBatch: true,
        autoConfirmDialogs: false,
        stopOnWarning: true,
        testMode: false,
        acknowledgedDisclaimer: false
      },
      stats: {
        detected: 0,
        processed: 0,
        connected: 0,
        skipped: 0,
        errors: 0,
        stopped: 0,
        sessionStartTime: Date.now(),
        lastActionTime: null,
        lastActionText: 'Installed'
      },
      activityLogs: [
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          message: 'LinkedIn Network Assistant installed successfully.',
          type: 'INFO'
        }
      ]
    });
  }
});

// Listener for background messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'PONG', active: true });
    return false;
  }

  if (request.action === 'INJECT_CONTENT_SCRIPTS') {
    const tabId = request.tabId;
    if (!tabId) {
      sendResponse({ success: false, message: 'Missing tabId' });
      return false;
    }

    const files = [
      "storage.js",
      "linkedin/detector.js",
      "linkedin/scanner.js",
      "linkedin/dialog-handler.js",
      "linkedin/scroll-manager.js",
      "linkedin/safety-manager.js",
      "linkedin/action-manager.js",
      "ui/notification.js",
      "ui/modal.js",
      "ui/floating-panel.js",
      "content.js"
    ];

    chrome.scripting.executeScript({
      target: { tabId },
      files
    }).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error('[LinkedIn Assistant] Auto-injection failed:', err);
      sendResponse({ success: false, error: err.message });
    });

    return true; // Keep channel open for async response
  }

  if (request.action === 'UPDATE_BADGE') {
    const text = request.badgeText || '';
    const color = request.badgeColor || '#0A66C2';
    if (sender.tab && sender.tab.id) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color });
    } else {
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color });
    }
    sendResponse({ success: true });
    return false;
  }

  return false;
});

