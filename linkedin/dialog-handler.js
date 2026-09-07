/**
 * LinkedIn Network Assistant - Dialog Handler Module
 * Manages LinkedIn post-click confirmation modals (e.g., "Send without a note").
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.DialogHandler = (function () {
  // Common selectors for LinkedIn invitation modals
  const DIALOG_SELECTORS = [
    '.artdeco-modal[role="dialog"]',
    '.send-invite',
    '[aria-labelledby*="send-invite"]',
    '.artdeco-modal'
  ];

  /**
   * Check if a confirmation dialog is currently open on page
   */
  function findOpenDialog() {
    for (const selector of DIALOG_SELECTORS) {
      const dialogs = Array.from(document.querySelectorAll(selector));
      for (const d of dialogs) {
        const style = window.getComputedStyle(d);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return d;
        }
      }
    }
    return null;
  }

  /**
   * Find "Send without a note" or direct "Send" button within dialog
   */
  function findSendWithoutNoteButton(dialog) {
    if (!dialog) return null;
    const buttons = Array.from(dialog.querySelectorAll('button, [role="button"]'));

    for (const btn of buttons) {
      const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
      const aria = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
      const combined = `${text} ${aria}`;

      if (combined.includes('send without a note') || combined.includes('send now') || combined === 'send') {
        return btn;
      }
    }
    return null;
  }

  /**
   * Handle dialog based on user settings
   * @returns {Promise<{ handled: boolean, autoConfirmed: boolean, requiresUserConfirmation: boolean }>}
   */
  async function handleDialog(autoConfirmSetting = false) {
    const dialog = findOpenDialog();
    if (!dialog) {
      return { handled: true, autoConfirmed: false, requiresUserConfirmation: false };
    }

    const sendBtn = findSendWithoutNoteButton(dialog);

    if (autoConfirmSetting && sendBtn) {
      // Auto-click "Send without a note"
      sendBtn.click();
      return { handled: true, autoConfirmed: true, requiresUserConfirmation: false };
    } else {
      // User must explicitly confirm
      return { handled: false, autoConfirmed: false, requiresUserConfirmation: true, dialogElement: dialog };
    }
  }

  return {
    findOpenDialog,
    findSendWithoutNoteButton,
    handleDialog
  };
})();
