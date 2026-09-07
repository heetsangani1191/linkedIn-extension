/**
 * LinkedIn Network Assistant - Storage Management Module
 * Uses chrome.storage.local for persisting settings, stats, and activity logs.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.Storage = (function () {
  const DEFAULT_SETTINGS = {
    batchSize: 5,
    maxActions: 20,
    minDelay: 3, // seconds
    maxDelay: 7, // seconds
    autoScroll: true,
    confirmBeforeBatch: true,
    autoConfirmDialogs: false, // OFF by default as required
    stopOnWarning: true, // Locked ON
    testMode: false, // Developer Test Mode
    acknowledgedDisclaimer: false,
    debugMode: false
  };

  const DEFAULT_STATS = {
    detected: 0,
    processed: 0,
    connected: 0,
    skipped: 0,
    errors: 0,
    stopped: 0,
    sessionStartTime: null,
    lastActionTime: null,
    lastActionText: 'None'
  };

  function isContextValid() {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id && !!chrome.storage && !!chrome.storage.local;
  }

  /**
   * Get all settings merged with defaults
   */
  async function getSettings() {
    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve(Object.assign({}, DEFAULT_SETTINGS, { stopOnWarning: true }));
        return;
      }
      try {
        chrome.storage.local.get(['settings'], (result) => {
          if (chrome.runtime.lastError) {
            resolve(Object.assign({}, DEFAULT_SETTINGS, { stopOnWarning: true }));
            return;
          }
          const settings = Object.assign({}, DEFAULT_SETTINGS, (result && result.settings) || {});
          settings.stopOnWarning = true;
          resolve(settings);
        });
      } catch (e) {
        resolve(Object.assign({}, DEFAULT_SETTINGS, { stopOnWarning: true }));
      }
    });
  }

  /**
   * Save partial or full settings
   */
  async function saveSettings(newSettings) {
    const current = await getSettings();
    const updated = Object.assign({}, current, newSettings);
    updated.stopOnWarning = true; // Ensure locked ON

    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve(updated);
        return;
      }
      try {
        chrome.storage.local.set({ settings: updated }, () => {
          resolve(updated);
        });
      } catch (e) {
        resolve(updated);
      }
    });
  }

  /**
   * Get activity logs (max 100 entries)
   */
  async function getLogs() {
    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve([]);
        return;
      }
      try {
        chrome.storage.local.get(['activityLogs'], (result) => {
          if (chrome.runtime.lastError) {
            resolve([]);
            return;
          }
          resolve((result && result.activityLogs) || []);
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  /**
   * Append a log entry
   */
  async function addLog(message, type = 'INFO') {
    if (!isContextValid()) return [];
    const logs = await getLogs();
    const timeString = new Date().toLocaleTimeString('en-US', { hour12: false });
    const entry = {
      timestamp: timeString,
      message,
      type: type.toUpperCase()
    };
    logs.unshift(entry); // newest first
    if (logs.length > 100) logs.pop();

    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve(logs);
        return;
      }
      try {
        chrome.storage.local.set({ activityLogs: logs }, () => {
          resolve(logs);
        });
      } catch (e) {
        resolve(logs);
      }
    });
  }

  /**
   * Clear all activity logs
   */
  async function clearLogs() {
    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve([]);
        return;
      }
      try {
        chrome.storage.local.set({ activityLogs: [] }, () => {
          resolve([]);
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  /**
   * Get daily session stats
   */
  async function getStats() {
    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve(Object.assign({}, DEFAULT_STATS));
        return;
      }
      try {
        chrome.storage.local.get(['stats'], (result) => {
          if (chrome.runtime.lastError) {
            resolve(Object.assign({}, DEFAULT_STATS));
            return;
          }
          const stats = Object.assign({}, DEFAULT_STATS, (result && result.stats) || {});
          resolve(stats);
        });
      } catch (e) {
        resolve(Object.assign({}, DEFAULT_STATS));
      }
    });
  }

  /**
   * Update statistics
   */
  async function updateStats(deltaStats) {
    const current = await getStats();
    const updated = Object.assign({}, current, deltaStats);
    if (!updated.sessionStartTime) {
      updated.sessionStartTime = Date.now();
    }
    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve(updated);
        return;
      }
      try {
        chrome.storage.local.set({ stats: updated }, () => {
          resolve(updated);
        });
      } catch (e) {
        resolve(updated);
      }
    });
  }

  /**
   * Reset session stats
   */
  async function resetStats() {
    const reset = Object.assign({}, DEFAULT_STATS, { sessionStartTime: Date.now() });
    return new Promise((resolve) => {
      if (!isContextValid()) {
        resolve(reset);
        return;
      }
      try {
        chrome.storage.local.set({ stats: reset }, () => {
          resolve(reset);
        });
      } catch (e) {
        resolve(reset);
      }
    });
  }

  return {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    getLogs,
    addLog,
    clearLogs,
    getStats,
    updateStats,
    resetStats
  };
})();
