import { verifyTurnstileToken } from './turnstile-utils.js';

/**
 * Enhanced login function with Turnstile verification
 * @param {string} username - User's username
 * @param {string} password - User's password  
 * @param {string} turnstileToken - Turnstile verification token
 * @param {string} userIP - Optional: User's IP address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const authenticateWithTurnstile = async (username, password, turnstileToken, userIP = null) => {
  try {
    // First verify the Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstileToken, userIP);

    if (!turnstileResult.success) {
      return {
        success: false,
        error: 'Échec de la vérification de sécurité: ' + (turnstileResult.error || 'Token invalide')
      };
    }

    // If Turnstile verification passes, proceed with regular authentication
    // This is where you would call your existing authentication logic
    // For example: return await yourExistingLoginFunction(username, password);

    return {
      success: true,
      message: 'Vérification Turnstile réussie'
    };

  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de l\'authentification'
    };
  }
};

/**
 * Example integration with your existing context
 * Update your Context's handleLogin method to use this
 */
export const enhancedHandleLogin = async (username, password, turnstileToken) => {
  // Verify Turnstile first
  const authResult = await authenticateWithTurnstile(username, password, turnstileToken);

  if (!authResult.success) {
    return false;
  }

  // Continue with your existing login logic here
  // Example: return await yourExistingDatabaseCheck(username, password);

  return true;
};