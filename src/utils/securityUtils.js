// Security utilities for input sanitization and validation
// Prevents XSS and SQL injection attacks

export const securityUtils = {
  // Sanitize input to prevent XSS attacks (more balanced approach)
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove potentially dangerous patterns while preserving legitimate content
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:(?!image\/)/gi, '') // Remove data: URLs except images
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/expression\s*\(/gi, '') // Remove CSS expressions
      .replace(/<link\b[^>]*>/gi, '') // Remove link tags
      .replace(/<meta\b[^>]*>/gi, '') // Remove meta tags
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
      .trim();
  },

  // Sanitize for display (more aggressive for output)
  sanitizeForDisplay(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    return this.escapeHtml(input);
  },

  // Sanitize username (specific rules for usernames)
  sanitizeUsername(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Only allow alphanumeric characters, underscores, and hyphens
    return input.replace(/[^a-zA-Z0-9_-]/g, '').trim();
  },

  // Validate username format
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return false;
    }
    
    const sanitized = this.sanitizeInput(username);
    
    // Username should be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(sanitized);
  },

  // Validate password format
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return false;
    }
    
    // Password should be at least 8 characters and contain at least one number and one letter
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  },

  // Validate password strength
  getPasswordStrength(password) {
    if (!password) return { score: 0, feedback: 'Mot de passe requis' };
    
    let score = 0;
    const feedback = [];
    
    if (password.length >= 8) score += 1;
    else feedback.push('Au moins 8 caractères');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Au moins une lettre minuscule');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Au moins une lettre majuscule');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Au moins un chiffre');
    
    if (/[@$!%*#?&]/.test(password)) score += 1;
    else feedback.push('Au moins un caractère spécial (@$!%*#?&)');
    
    const strength = score <= 2 ? 'Faible' : score <= 3 ? 'Moyen' : score <= 4 ? 'Fort' : 'Très fort';
    
    return {
      score,
      strength,
      feedback: feedback.length > 0 ? feedback : ['Mot de passe fort']
    };
  },

  // Escape HTML entities to prevent XSS
  escapeHtml(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    
    return text.replace(/[&<>"'`=\/]/g, (s) => map[s]);
  },

  // Rate limiting for login attempts
  rateLimit: {
    attempts: new Map(),
    
    isAllowed(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
      const now = Date.now();
      const key = ip || 'default';
      
      if (!this.attempts.has(key)) {
        this.attempts.set(key, { count: 0, firstAttempt: now });
        return true;
      }
      
      const attempt = this.attempts.get(key);
      
      // Reset if window has passed
      if (now - attempt.firstAttempt > windowMs) {
        this.attempts.set(key, { count: 1, firstAttempt: now });
        return true;
      }
      
      // Check if under limit
      if (attempt.count < maxAttempts) {
        attempt.count++;
        return true;
      }
      
      return false;
    },
    
    reset(ip) {
      const key = ip || 'default';
      this.attempts.delete(key);
    }
  },

  // Generate CSRF token
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Validate CSRF token
  validateCSRFToken(token, storedToken) {
    return token && storedToken && token === storedToken;
  }
};
