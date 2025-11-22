/**
 * Turnstile verification utilities
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify Turnstile token with Cloudflare
 * @param {string} token - The Turnstile token to verify
 * @param {string} remoteip - Optional: The user's IP address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyTurnstileToken = async (token, remoteip = null) => {
  try {
    const secretKey = import.meta.env.VITE_TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      return { success: false, error: 'Configuration error' };
    }

    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return { success: false, error: 'Network error' };
    }

    const result = await response.json();

    return {
      success: result.success,
      error: result.success ? null : (result['error-codes']?.join(', ') || 'Verification failed')
    };
  } catch (error) {
    return { success: false, error: 'Verification failed' };
  }
};

/**
 * Client-side token validation (basic checks)
 * @param {string} token - The Turnstile token
 * @returns {boolean}
 */
export const isValidTurnstileToken = (token) => {
  return typeof token === 'string' && token.length > 0;
};