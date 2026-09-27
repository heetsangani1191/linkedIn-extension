/**
 * LinkedIn Network Assistant - Controlled Scroll Manager Module
 * Performs gradual, human-like scrolling to trigger dynamic card loading without rapid infinite scroll.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.ScrollManager = (function () {
  let isScrolling = false;

  /**
   * Forcefully scroll browser DOM down and dispatch scroll events for LinkedIn dynamic feed loading
   */
  function forceScrollDown(distance = 800) {
    const scroller = document.scrollingElement || document.documentElement || document.body;
    if (scroller) {
      scroller.scrollTop += distance;
    }
    try {
      window.scrollBy(0, distance);
    } catch (e) {}
    try {
      window.dispatchEvent(new Event('scroll'));
      document.dispatchEvent(new Event('scroll'));
    } catch (e) {}
  }

  /**
   * Scroll down the page smoothly and check for newly loaded Connect/Like buttons
   * @param {Function} onProgress Progress update callback
   * @returns {Promise<{ newButtonsCount: number, totalButtons: Array, stoppedNoNew: boolean }>}
   */
  async function scrollAndLoadMore(onProgress) {
    if (isScrolling) return { newButtonsCount: 0, totalButtons: [], stoppedNoNew: false };
    isScrolling = true;

    const ActionManager = window.LinkedInAssistant.ActionManager;
    const Detector = window.LinkedInAssistant.Detector;
    const mode = (ActionManager && ActionManager.getMode) ? ActionManager.getMode() : 'CONNECT';

    function getButtons() {
      return mode === 'LIKE' ? Detector.findLikeButtons(false) : Detector.findConnectButtons(false);
    }

    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      attempts++;
      const targetLabel = mode === 'LIKE' ? 'feed posts' : 'profiles';
      if (onProgress) onProgress(`Scrolling feed for new ${targetLabel} (Step ${attempts}/${maxAttempts})...`);

      // 1. Target last feed post card scrollIntoView if available
      if (mode === 'LIKE') {
        const postCards = Array.from(document.querySelectorAll('.feed-shared-update-v2, [data-urn], .occluded-update, .feed-shared-update'));
        if (postCards.length > 0) {
          try {
            postCards[postCards.length - 1].scrollIntoView({ behavior: 'auto', block: 'end' });
          } catch (e) {}
        }
      }

      // 2. Force scroll down window/document scrollingElement
      forceScrollDown(850);

      // 3. Wait 2 seconds for LinkedIn dynamic feed DOM render
      const waitTime = Math.floor(Math.random() * 600) + 1800;
      await new Promise(r => setTimeout(r, waitTime));

      const updatedButtons = getButtons();
      if (updatedButtons.length > 0) {
        isScrolling = false;
        return {
          newButtonsCount: updatedButtons.length,
          totalButtons: updatedButtons,
          stoppedNoNew: false
        };
      }
    }

    // Final attempt: force scroll down further
    if (onProgress) onProgress('Triggering feed infinite load...');
    forceScrollDown(1500);
    await new Promise(r => setTimeout(r, 2500));

    const finalButtons = getButtons();
    isScrolling = false;

    return {
      newButtonsCount: finalButtons.length,
      totalButtons: finalButtons,
      stoppedNoNew: finalButtons.length === 0
    };
  }

  function stopScroll() {
    isScrolling = false;
  }

  return {
    scrollAndLoadMore,
    stopScroll
  };
})();
