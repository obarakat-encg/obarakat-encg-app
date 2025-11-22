// Security configuration and constants
export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SPECIAL_CHARS: false,
    ALLOWED_SPECIAL_CHARS: '@$!%*#?&',
  },

  // Username requirements
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    ALLOWED_PATTERN: /^[a-zA-Z0-9_-]+$/,
  },

  // Rate limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    BLOCK_DURATION: 30 * 60 * 1000, // 30 minutes
  },

  // Session security
  SESSION: {
    TIMEOUT_MS: 365 * 24 * 60 * 60 * 1000, // 1 year (effectively no timeout)
    REFRESH_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours
  },

  // File upload security
  FILE_UPLOAD: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-rar-compressed',
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'],
  },

  // Content Security Policy
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
    STYLE_SRC: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    IMG_SRC: ["'self'", 'data:', 'https:'],
    FONT_SRC: ["'self'", 'https://fonts.gstatic.com'],
    CONNECT_SRC: ["'self'", 'https://*.firebaseio.com', 'https://*.googleapis.com'],
    FRAME_SRC: ["'none'"],
    OBJECT_SRC: ["'none'"],
    BASE_URI: ["'self'"],
    FORM_ACTION: ["'self'"],
  },

  // Input validation patterns
  VALIDATION: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[\d\s\-\(\)]+$/,
    SAFE_STRING: /^.+$/,  // Allow any non-empty string
    FILENAME: /^.+\..+$/,  // Just require a filename with extension
  },

  // Error messages (avoid revealing system details)
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Identifiants incorrects',
    ACCOUNT_LOCKED: 'Compte temporairement verrouillé',
    RATE_LIMITED: 'Trop de tentatives. Réessayez plus tard',
    INVALID_INPUT: 'Données invalides',
    UNAUTHORIZED: 'Accès non autorisé',
    FORBIDDEN: 'Action interdite',
    SERVER_ERROR: 'Erreur serveur temporaire',
    FILE_TOO_LARGE: 'Fichier trop volumineux',
    INVALID_FILE_TYPE: 'Type de fichier non autorisé',
  },
};

// Security headers for HTTP responses
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Generate Content Security Policy header
export function generateCSPHeader() {
  const csp = SECURITY_CONFIG.CSP;
  const directives = Object.entries(csp).map(([key, values]) => {
    const directive = key.toLowerCase().replace(/_/g, '-');
    return `${directive} ${values.join(' ')}`;
  });
  
  return directives.join('; ');
}

// Validate file upload security
export function validateFileUpload(file) {
  const config = SECURITY_CONFIG.FILE_UPLOAD;
  
  // Check file size
  if (file.size > config.MAX_SIZE) {
    return { valid: false, error: SECURITY_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE };
  }
  
  // Check file type
  if (!config.ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: SECURITY_CONFIG.ERROR_MESSAGES.INVALID_FILE_TYPE };
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!config.ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: SECURITY_CONFIG.ERROR_MESSAGES.INVALID_FILE_TYPE };
  }
  
  // Check filename for malicious patterns
  if (!SECURITY_CONFIG.VALIDATION.FILENAME.test(file.name)) {
    return { valid: false, error: SECURITY_CONFIG.ERROR_MESSAGES.INVALID_INPUT };
  }
  
  return { valid: true };
}

// Check if session is expired
export function isSessionExpired(loginTime) {
  const now = Date.now();
  const sessionAge = now - loginTime;
  return sessionAge > SECURITY_CONFIG.SESSION.TIMEOUT_MS;
}

// Check if session needs refresh
export function needsSessionRefresh(lastActivity) {
  const now = Date.now();
  const timeSinceActivity = now - lastActivity;
  return timeSinceActivity > SECURITY_CONFIG.SESSION.REFRESH_THRESHOLD;
}