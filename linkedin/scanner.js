/**
 * LinkedIn Network Assistant - Page Scanner Module
 * Scans page DOM and utilizes MutationObserver to detect newly loaded LinkedIn cards.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.Scanner = (function () {
  let observer = null;
  let isScanning = false;
  let onMutationCallback = null;

  /**
   * Start observing DOM changes for new connect buttons
   */
  function startObserver(callback) {
    if (observer) {
      observer.disconnect();
    }
    onMutationCallback = callback;
    isScanning = true;

    let debounceTimer = null;

    observer = new MutationObserver((mutations) => {
      // Debounce mutation updates
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!isScanning) return;
        const currentButtons = window.LinkedInAssistant.Detector.findConnectButtons();
        if (onMutationCallback) {
          onMutationCallback(currentButtons);
        }
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Stop MutationObserver
   */
  function stopObserver() {
    isScanning = false;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  /**
   * Perform an immediate DOM scan
   */
  function scanPage() {
    const Detector = window.LinkedInAssistant.Detector;
    const buttons = Detector.findConnectButtons();
    const totalCards = document.querySelectorAll(Detector.SELECTOR_CONFIG.cardContainers.join(',')).length;

    return {
      buttonsCount: buttons.length,
      buttons,
      totalCards,
      url: window.location.href
    };
  }

  return {
    startObserver,
    stopObserver,
    scanPage
  };
})();
