/**
 * LinkedIn Network Assistant - Safety Manager Module
 * Monitors DOM and URL for LinkedIn security check points, CAPTCHAs, rate limit warnings, and page navigations.
 */

window.LinkedInAssistant = window.LinkedInAssistant || {};

window.LinkedInAssistant.SafetyManager = (function () {
  const CAPTCHA_SELECTORS = [
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
    '.g-recaptcha',
    '#captcha',
    '[id*="captcha"]',
    '.arkose-frame',
    'iframe[src*="arkoselabs"]'
  ];

  const WARNING_TEXT_PATTERNS = [
    "you're out of invitations",
    "unusual activity",
    "account restricted",
    "verification required",
    "security check",
    "please verify",
    "exceeded the daily limit",
    "weekly invitation limit",
    "temporarily restricted"
  ];

  /**
   * Run safety check on DOM and location
   * @returns {{ safe: boolean, reason?: string }}
   */
  function checkSafety() {
    // 1. Check URL valid LinkedIn page
    const currentUrl = window.location.href;
    if (!currentUrl.includes('linkedin.com')) {
      return {
        safe: false,
        reason: 'Page navigated away from LinkedIn.'
      };
    }

    // 2. Check for CAPTCHA elements
    for (const selector of CAPTCHA_SELECTORS) {
      const captchaEl = document.querySelector(selector);
      if (captchaEl) {
        return {
          safe: false,
          reason: 'LinkedIn CAPTCHA / Security verification screen detected.'
        };
      }
    }

    // 3. Check for security warning modals or body text
    const pageText = (document.body ? document.body.innerText : '').toLowerCase();
    for (const pattern of WARNING_TEXT_PATTERNS) {
      if (pageText.includes(pattern)) {
        return {
          safe: false,
          reason: `LinkedIn security alert detected ("${pattern}").`
        };
      }
    }

    // 4. Check for modal popups containing security warning
    const modals = Array.from(document.querySelectorAll('.artdeco-modal, [role="dialog"]'));
    for (const modal of modals) {
      const modalText = (modal.innerText || '').toLowerCase();
      if (modalText.includes('limit') || modalText.includes('restrict') || modalText.includes('unusual')) {
        return {
          safe: false,
          reason: 'LinkedIn rate limit or restriction modal detected.'
        };
      }
    }

    return { safe: true };
  }

  return {
    checkSafety
  };
})();
