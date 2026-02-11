// components/auth/GoogleSignInButton.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';

// Extend Window for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              logo_alignment?: 'left' | 'center';
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  /** Text shown on the button */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  /** Callback when sign-in fails */
  onError?: (error: string) => void;
  /** Disable the button */
  disabled?: boolean;
};

export default function GoogleSignInButton({
  text = 'continue_with',
  onError,
  disabled = false,
}: GoogleSignInButtonProps) {
  const { signInWithGoogleIdToken } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      const result = await signInWithGoogleIdToken(response.credential);
      if (result.error) {
        onError?.(result.error);
      } else {
        router.push('/canvas');
      }
    },
    [signInWithGoogleIdToken, router, onError]
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
      return;
    }

    const initializeGoogle = () => {
      if (!window.google || !buttonRef.current || initializedRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'pill',
        width: 320,
        logo_alignment: 'left',
      });
    };

    // If Google script already loaded
    if (window.google) {
      initializeGoogle();
      return;
    }

    // Load Google Identity Services script
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi"]');
    if (existingScript) {
      // Script exists but hasn't loaded yet
      existingScript.addEventListener('load', initializeGoogle);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      initializedRef.current = false;
    };
  }, [handleCredentialResponse, text]);

  return (
    <div className="w-full">
      {/* Google's rendered button — it respects dark mode automatically */}
      <div
        ref={buttonRef}
        className={`flex justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        style={{ minHeight: 44 }}
      />
    </div>
  );
}
