/**
 * LinkedIn Network Assistant - Injected Floating Control Panel
 * Non-intrusive, minimizable, draggable panel injected on the right side of LinkedIn pages.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.FloatingPanel = (function () {
  let panelElement = null;
  let isMinimized = false;

  function initPanel() {
    if (panelElement && document.body.contains(panelElement)) return;

    panelElement = document.createElement('div');
    panelElement.id = 'lna-floating-panel';
    panelElement.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 240px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      z-index: 2147483645;
      font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    renderContent();
    document.body.appendChild(panelElement);
    attachEvents();

    // Listen for ActionManager state changes
    if (window.LinkedInAssistant.ActionManager) {
      window.LinkedInAssistant.ActionManager.addStateListener(() => {
        updateData();
      });
    }
  }

  function renderContent() {
    if (!panelElement) return;

    if (isMinimized) {
      panelElement.style.width = '180px';
      panelElement.innerHTML = `
        <div id="lna-panel-header" style="padding: 10px 14px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12px; color: #0A66C2;">
            <span>🔵</span> LinkedIn Assistant
          </div>
          <button id="lna-toggle-btn" style="background:none; border:none; color:#666; cursor:pointer; font-size: 14px;">➕</button>
        </div>
      `;
    } else {
      panelElement.style.width = '240px';
      panelElement.innerHTML = `
        <div id="lna-panel-header" style="padding: 12px 14px; background: #0A66C2; color: #ffffff; display: flex; align-items: center; justify-content: space-between; cursor: move; user-select: none;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px;">
            <span>💼</span> LinkedIn Assistant
          </div>
          <button id="lna-toggle-btn" style="background:none; border:none; color:#ffffff; cursor:pointer; font-size: 14px; padding: 0 4px;">➖</button>
        </div>
        <div style="padding: 12px 14px; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; margin-bottom: 10px;" id="lna-status-indicator">
            <span id="lna-status-dot" style="color: #057642;">●</span>
            <span id="lna-status-text" style="color: #333333;">Ready</span>
          </div>
          <div style="font-size: 12px; color: #555555; display: flex; flex-direction: column; gap: 6px; background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Detected:</span>
              <strong id="lna-fp-detected">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Processed:</span>
              <strong id="lna-fp-processed">0/20</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Connected:</span>
              <strong id="lna-fp-connected" style="color: #057642;">0</strong>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="lna-fp-pause-btn" style="flex: 1; padding: 7px; border: 1px solid #dcdcdc; background: #ffffff; color: #333; border-radius: 16px; font-size: 11px; font-weight: 600; cursor: pointer;">Pause</button>
            <button id="lna-fp-stop-btn" style="flex: 1; padding: 7px; border: none; background: #CC1010; color: #ffffff; border-radius: 16px; font-size: 11px; font-weight: 600; cursor: pointer;">Stop</button>
          </div>
        </div>
      `;
    }

    attachEvents();
    updateData();
  }

  function attachEvents() {
    if (!panelElement) return;

    const toggleBtn = panelElement.querySelector('#lna-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        renderContent();
      });
    }

    if (isMinimized) return;

    const pauseBtn = panelElement.querySelector('#lna-fp-pause-btn');
    const stopBtn = panelElement.querySelector('#lna-fp-stop-btn');

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        const ActionManager = window.LinkedInAssistant.ActionManager;
        if (ActionManager.getState() === ActionManager.STATES.PROCESSING) {
          ActionManager.pauseAutomation();
        } else if (ActionManager.getState() === ActionManager.STATES.PAUSED) {
          ActionManager.resumeAutomation();
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        window.LinkedInAssistant.ActionManager.stopAutomation('Stopped from floating panel.');
      });
    }

    // Draggable header implementation
    const header = panelElement.querySelector('#lna-panel-header');
    if (header) {
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target === toggleBtn) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = panelElement.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        panelElement.style.right = 'auto';
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        panelElement.style.left = `${initialLeft + dx}px`;
        panelElement.style.top = `${initialTop + dy}px`;
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }
  }

  async function updateData() {
    if (!panelElement || isMinimized) return;

    const ActionManager = window.LinkedInAssistant.ActionManager;
    const Detector = window.LinkedInAssistant.Detector;
    const Storage = window.LinkedInAssistant.Storage;

    const state = ActionManager ? ActionManager.getState() : 'IDLE';
    const mode = ActionManager && ActionManager.getMode ? ActionManager.getMode() : 'CONNECT';
    const statusMsg = ActionManager ? ActionManager.getStatusMessage() : 'Ready';
    const runStats = ActionManager ? ActionManager.getRunStats() : { processed: 0, connected: 0 };
    const detectedButtons = Detector ? (mode === 'LIKE' ? Detector.findLikeButtons(true).length : Detector.findConnectButtons(true).length) : 0;
    const settings = Storage ? await Storage.getSettings() : { maxActions: 20 };

    const statusDot = panelElement.querySelector('#lna-status-dot');
    const statusText = panelElement.querySelector('#lna-status-text');
    const fpDetected = panelElement.querySelector('#lna-fp-detected');
    const fpProcessed = panelElement.querySelector('#lna-fp-processed');
    const fpConnected = panelElement.querySelector('#lna-fp-connected');
    const pauseBtn = panelElement.querySelector('#lna-fp-pause-btn');

    if (fpDetected) fpDetected.textContent = detectedButtons;
    if (fpProcessed) fpProcessed.textContent = `${runStats.processed}/${settings.maxActions}`;
    if (fpConnected) {
      fpConnected.textContent = runStats.connected;
      const connectedLabelEl = fpConnected.parentElement ? fpConnected.parentElement.querySelector('span') : null;
      if (connectedLabelEl) {
        connectedLabelEl.textContent = mode === 'LIKE' ? 'Liked:' : 'Connected:';
      }
    }

    if (statusText) statusText.textContent = statusMsg.length > 20 ? statusMsg.substring(0, 20) + '...' : statusMsg;

    if (statusDot) {
      if (state === 'PROCESSING') {
        statusDot.style.color = '#057642';
        statusDot.textContent = '●';
      } else if (state === 'PAUSED' || state === 'WAITING_CONFIRMATION' || state === 'WAITING_DIALOG') {
        statusDot.style.color = '#E6A23C';
        statusDot.textContent = '●';
      } else if (state === 'SAFETY_STOP' || state === 'STOPPED') {
        statusDot.style.color = '#CC1010';
        statusDot.textContent = '●';
      } else {
        statusDot.style.color = '#0A66C2';
        statusDot.textContent = '●';
      }
    }

    if (pauseBtn) {
      pauseBtn.textContent = state === 'PAUSED' ? 'Resume' : 'Pause';
    }
  }

  function removePanel() {
    if (panelElement && panelElement.parentNode) {
      panelElement.parentNode.removeChild(panelElement);
      panelElement = null;
    }
  }

  return {
    initPanel,
    updateData,
    removePanel
  };
})();
