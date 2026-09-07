/**
 * LinkedIn Network Assistant - DOM Button Detector Module
 * Robust heuristic layer for identifying Connect buttons without relying solely on brittle CSS classes.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.Detector = (function () {
  // WeakSet to track processed DOM elements in-memory during run
  let processedElements = new WeakSet();

  // Centralized selector configuration for resilience against DOM changes
  const SELECTOR_CONFIG = {
    // Potential profile card container selectors
    cardContainers: [
      '.discover-person-card',
      '.entity-result',
      '.artdeco-card',
      '.pv-profile-card',
      '.reusable-search__result-container',
      '[data-view-name*="profile"]',
      '[data-view-name*="card"]',
      '[data-view-name="edge-person-card"]',
      '.mn-discovery-person-card',
      'li.grid__item',
      '.invitation-card'
    ],
    // Words that indicate non-connect buttons to explicitly EXCLUDE
    excludedTexts: [
      'follow',
      'following',
      'message',
      'pending',
      'accept',
      'remove',
      'more',
      'withdraw',
      'ignore',
      'dismiss',
      'sponsored',
      'view',
      'share',
      'endorse'
    ]
  };

  /**
   * Reset processed elements set and clear DOM markers
   */
  function resetProcessedSet() {
    processedElements = new WeakSet();
    try {
      document.querySelectorAll('[data-lna-processed]').forEach(el => {
        el.removeAttribute('data-lna-processed');
      });
      document.querySelectorAll('[data-lna-highlight]').forEach(el => {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.removeAttribute('data-lna-highlight');
      });
    } catch (e) {}
  }

  /**
   * Mark an element as processed
   */
  function markProcessed(element) {
    if (element) {
      processedElements.add(element);
      element.setAttribute('data-lna-processed', 'true');
    }
  }

  /**
   * Check if an element was already processed
   */
  function isProcessed(element) {
    if (!element) return true;
    return processedElements.has(element) || element.getAttribute('data-lna-processed') === 'true';
  }

  /**
   * Check if element is truly visible on page
   */
  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Find the associated profile card container for a button
   */
  function findParentCard(element) {
    let current = element.parentElement;
    let depth = 0;
    while (current && depth < 8) {
      // Check known selectors
      for (const selector of SELECTOR_CONFIG.cardContainers) {
        if (current.matches && current.matches(selector)) {
          return current;
        }
      }
      // Heuristic: card contains profile link or avatar
      if (current.querySelector && (current.querySelector('a[href*="/in/"]') || current.querySelector('img[alt*="profile"]'))) {
        return current;
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  /**
   * Extract all visible button text including nested spans
   */
  function getButtonText(element) {
    if (!element) return '';
    let text = (element.innerText || element.textContent || '').trim().toLowerCase();
    const ariaLabel = (element.getAttribute('aria-label') || '').trim().toLowerCase();
    return `${text} ${ariaLabel}`;
  }

  /**
   * Strict heuristic check to verify if a DOM button is an eligible Connect button
   */
  function isEligibleConnectButton(button) {
    if (!button || !isVisible(button)) return false;

    // Must be button tag or role="button"
    const isButtonTag = button.tagName.toLowerCase() === 'button';
    const isRoleButton = button.getAttribute('role') === 'button';
    if (!isButtonTag && !isRoleButton) return false;

    // Disabled check
    if (button.disabled || button.getAttribute('aria-disabled') === 'true') return false;

    const fullText = getButtonText(button);

    // Check for explicitly excluded keywords
    for (const excluded of SELECTOR_CONFIG.excludedTexts) {
      // Avoid false positive if excluded string is substring of "connect"
      if (fullText.includes(excluded)) {
        return false;
      }
    }

    // Must contain "connect" or "invite" in text or aria-label
    const hasConnectIntent = fullText.includes('connect') || fullText.includes('invite');
    if (!hasConnectIntent) return false;

    // Must be inside a valid profile/person card or result item
    const parentCard = findParentCard(button);
    if (!parentCard) {
      // Check if button text explicitly names a person connect aria-label e.g. "Invite John to connect"
      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
      if (!ariaLabel.includes('invite') && !ariaLabel.includes('connect')) {
        return false;
      }
    }

    // Check if parent card has sponsored tag
    if (parentCard) {
      const cardText = parentCard.innerText.toLowerCase();
      if (cardText.includes('promoted') || cardText.includes('sponsored')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Primary function: scan DOM and return array of eligible Connect DOM elements
   * @param {boolean} includeProcessed If true, returns all eligible connect buttons including previously processed ones
   */
  function findConnectButtons(includeProcessed = false) {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'));
    const validButtons = [];

    for (const btn of candidates) {
      if (!includeProcessed && isProcessed(btn)) continue;
      if (isEligibleConnectButton(btn)) {
        validButtons.push(btn);
      }
    }

    return validButtons;
  }

  /**
   * Apply test mode highlight borders to detected buttons
   */
  function highlightButtons(buttons, highlight = true) {
    buttons.forEach((btn, index) => {
      if (highlight) {
        btn.style.outline = '3px solid #0A66C2';
        btn.style.outlineOffset = '2px';
        btn.setAttribute('data-lna-highlight', `Connect Button #${index + 1}`);
      } else {
        btn.style.outline = '';
        btn.style.outlineOffset = '';
        btn.removeAttribute('data-lna-highlight');
      }
    });
  }

  return {
    findConnectButtons,
    isEligibleConnectButton,
    isProcessed,
    markProcessed,
    resetProcessedSet,
    highlightButtons,
    findParentCard,
    SELECTOR_CONFIG
  };
})();
