/**
 * LinkedIn Network Assistant - Toast Notifications Module
 * Displays sleek in-page banner notifications on LinkedIn.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.Notification = (function () {
  let container = null;

  function ensureContainer() {
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.id = 'lna-notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Show toast notification
   * @param {string} message
   * @param {'info' | 'success' | 'warning' | 'error'} type
   * @param {number} durationMs
   */
  function showToast(message, type = 'info', durationMs = 4000) {
    const parent = ensureContainer();
    const toast = document.createElement('div');

    const bgColors = {
      info: '#0A66C2',
      success: '#057642',
      warning: '#E6A23C',
      error: '#CC1010'
    };

    toast.style.cssText = `
      background: ${bgColors[type] || '#0A66C2'};
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      pointer-events: auto;
      max-width: 320px;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    `;

    toast.innerHTML = `
      <span>${message}</span>
      <button style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;line-height:1;padding:0;">&times;</button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });

    parent.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    if (durationMs > 0) {
      setTimeout(() => {
        removeToast(toast);
      }, durationMs);
    }
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }

  return {
    showToast
  };
})();
