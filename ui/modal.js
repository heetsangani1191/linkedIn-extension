/**
 * LinkedIn Network Assistant - Modal Manager Module
 * Renders in-page confirmation dialogs for batch starts and LinkedIn modal popups.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.Modal = (function () {
  let activeOverlay = null;

  function closeActiveModal() {
    if (activeOverlay && activeOverlay.parentNode) {
      activeOverlay.parentNode.removeChild(activeOverlay);
      activeOverlay = null;
    }
  }

  function createOverlay() {
    closeActiveModal();
    const overlay = document.createElement('div');
    overlay.id = 'lna-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    activeOverlay = overlay;
    return overlay;
  }

  /**
   * Show Batch Confirmation Modal
   */
  function showBatchConfirmModal(batchSize, onStart, onCancel) {
    const overlay = createOverlay();
    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      width: 340px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
    `;

    card.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 12px;">🤝</div>
      <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #191919; font-weight: 600;">Confirm Batch Start</h3>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #5e5e5e; line-height: 1.4;">
        Ready to process <strong>${batchSize}</strong> connection requests.
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="lna-batch-cancel-btn" style="flex:1; padding: 10px; border: 1px solid #dcdcdc; background: #fff; color: #5e5e5e; border-radius: 20px; font-weight: 600; cursor: pointer;">Cancel</button>
        <button id="lna-batch-start-btn" style="flex:1; padding: 10px; border: none; background: #0A66C2; color: #fff; border-radius: 20px; font-weight: 600; cursor: pointer;">Start Batch</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    card.querySelector('#lna-batch-start-btn').addEventListener('click', () => {
      closeActiveModal();
      if (onStart) onStart();
    });

    card.querySelector('#lna-batch-cancel-btn').addEventListener('click', () => {
      closeActiveModal();
      if (onCancel) onCancel();
    });
  }

  /**
   * Show Dialog Confirmation Prompt Modal (when LinkedIn asks for dialog confirmation)
   */
  function showDialogPromptModal(onContinue, onStop) {
    const overlay = createOverlay();
    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      width: 340px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
    `;

    card.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
      <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #191919; font-weight: 600;">Confirmation Required</h3>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #5e5e5e; line-height: 1.4;">
        LinkedIn is asking for confirmation ("Send without a note").
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="lna-dialog-stop-btn" style="flex:1; padding: 10px; border: 1px solid #dcdcdc; background: #fff; color: #cc1010; border-radius: 20px; font-weight: 600; cursor: pointer;">Stop</button>
        <button id="lna-dialog-continue-btn" style="flex:1; padding: 10px; border: none; background: #0A66C2; color: #fff; border-radius: 20px; font-weight: 600; cursor: pointer;">Continue</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    card.querySelector('#lna-dialog-continue-btn').addEventListener('click', () => {
      closeActiveModal();
      if (onContinue) onContinue();
    });

    card.querySelector('#lna-dialog-stop-btn').addEventListener('click', () => {
      closeActiveModal();
      if (onStop) onStop();
    });
  }

  return {
    showBatchConfirmModal,
    showDialogPromptModal,
    closeActiveModal
  };
})();
