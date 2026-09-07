/**
 * LinkedIn Network Assistant - Controlled Scroll Manager Module
 * Performs gradual, human-like scrolling to trigger dynamic card loading without rapid infinite scroll.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.ScrollManager = (function () {
  let isScrolling = false;
  const MAX_SCROLL_ATTEMPTS = 3;

  /**
   * Scroll down the page smoothly and check for newly loaded Connect buttons
   * @param {Function} onProgress Progress update callback
   * @returns {Promise<{ newButtonsCount: number, totalButtons: Array }>}
   */
  async function scrollAndLoadMore(onProgress) {
    if (isScrolling) return { newButtonsCount: 0, totalButtons: [] };
    isScrolling = true;

    const Detector = window.LinkedInAssistant.Detector;
    let attempts = 0;

    while (attempts < MAX_SCROLL_ATTEMPTS) {
      attempts++;
      if (onProgress) onProgress(`Scrolling page to load more profiles (Attempt ${attempts}/${MAX_SCROLL_ATTEMPTS})...`);

      // Scroll down by 500-800 pixels smoothly
      const currentScroll = window.scrollY || window.pageYOffset;
      const scrollStep = Math.floor(Math.random() * 300) + 500;
      window.scrollTo({
        top: currentScroll + scrollStep,
        behavior: 'smooth'
      });

      // Wait 2 to 3.5 seconds for network request & DOM render
      const waitTime = Math.floor(Math.random() * 1500) + 2000;
      await new Promise(r => setTimeout(r, waitTime));

      const updatedButtons = Detector.findConnectButtons(false);
      if (updatedButtons.length > 0) {
        isScrolling = false;
        return {
          newButtonsCount: updatedButtons.length,
          totalButtons: updatedButtons,
          stoppedNoNew: false
        };
      }
    }

    // Scroll to bottom once as final attempt
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
    await new Promise(r => setTimeout(r, 2500));

    const finalButtons = Detector.findConnectButtons(false);
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
