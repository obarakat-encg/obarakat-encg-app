import React, { useEffect, useRef, useState } from 'react';
import './styles/turnstile.css';

const Turnstile = React.forwardRef(({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = "light",
  size = "normal"
}, ref) => {
  const turnstileRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine the correct site key to use
  const effectiveSiteKey = siteKey || (
    import.meta.env.DEV
      ? import.meta.env.VITE_TURNSTILE_SITE_KEY_DEV || "1x00000000000000000000AA"
      : import.meta.env.VITE_TURNSTILE_SITE_KEY_PROD || "0x4AAAAAAB-d2QcHm-0e4-wb"
  );

  // Check if we should bypass Turnstile in development
  const shouldBypass = import.meta.env.DEV && import.meta.env.VITE_TURNSTILE_BYPASS_DEV === 'true';

  useEffect(() => {
    // If bypassing in development, simulate successful verification
    if (shouldBypass) {
      setIsLoading(false);
      setTimeout(() => {
        if (onVerify) onVerify('dev-bypass-token');
      }, 500);
      return;
    }

    // Load Turnstile script if not already loaded
    if (!window.turnstile) {
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (existingScript) {
        // Script is already loading, wait for it
        const checkLoaded = () => {
          if (window.turnstile) {
            setIsLoaded(true);
            setIsLoading(false);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      } else {
        // Load the script
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setIsLoaded(true);
          setIsLoading(false);
        };
        script.onerror = () => {
          setHasError(true);
          setIsLoading(false);
          if (onError) onError('Failed to load Turnstile script');
        };
        document.head.appendChild(script);
      }
    } else {
      setIsLoaded(true);
      setIsLoading(false);
    }

    return () => {
      // Cleanup widget on unmount - only if we have a valid widget ID
      if (widgetId !== null && window.turnstile && typeof window.turnstile.remove === 'function') {
        try {
          // Check if the widget still exists before removing
          const container = turnstileRef.current;
          if (container && container.querySelector('.cf-turnstile')) {
            window.turnstile.remove(widgetId);
          }
        } catch (e) {
          // Silently handle cleanup errors in production
          if (import.meta.env.DEV) {
            // Dev mode warning - silently handle
          }
        }
      }
    };
  }, [widgetId, onError, shouldBypass, onVerify]);

  useEffect(() => {
    if (isLoaded && turnstileRef.current && !widgetId && !hasError) {
      try {
        const id = window.turnstile.render(turnstileRef.current, {
          sitekey: effectiveSiteKey,
          callback: (token) => {
            if (import.meta.env.DEV) {
              // Dev mode - verification successful
            }
            if (onVerify) onVerify(token);
          },
          'error-callback': (error) => {
            // Handle specific error codes
            if (error === '110200') {
              // Invalid site key or domain configuration
            }

            setHasError(true);
            if (onError) onError(error);
          },
          'expired-callback': () => {
            if (import.meta.env.DEV) {
              // Dev mode - token expired
            }
            if (onExpire) onExpire();
          },
          theme: theme,
          size: size
        });
        setWidgetId(id);
      } catch (error) {
        setHasError(true);
        if (onError) onError(error);
      }
    }
  }, [isLoaded, effectiveSiteKey, onVerify, onError, onExpire, theme, size, widgetId, hasError]);

  const reset = () => {
    if (widgetId !== null && window.turnstile && typeof window.turnstile.reset === 'function') {
      try {
        window.turnstile.reset(widgetId);
        setHasError(false);
      } catch (error) {
        if (import.meta.env.DEV) {
          // Dev mode - error resetting
        }
      }
    }
  };

  // Expose reset method via ref
  React.useImperativeHandle(ref, () => ({
    reset
  }));

  if (hasError) {
    return (
      <div className="turnstile-widget turnstile-error">
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Erreur de chargement de la vérification de sécurité.
          <button
            onClick={() => window.location.reload()}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#c33',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  if (shouldBypass) {
    return (
      <div className="turnstile-widget turnstile-bypass">
        <div style={{
          padding: '12px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          color: '#856404',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          ⚠️ Mode développement: Vérification de sécurité contournée
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="turnstile-widget turnstile-loading">
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          Chargement de la vérification de sécurité...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={turnstileRef}
      className="turnstile-widget"
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '16px 0'
      }}
    />
  );
});

Turnstile.displayName = 'Turnstile';

export default Turnstile;