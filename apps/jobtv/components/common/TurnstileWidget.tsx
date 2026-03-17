"use client";

import { useEffect, useRef, useCallback } from "react";
import Script from "next/script";

interface TurnstileWidgetProps {
  onToken?: (token: string) => void;
  theme?: "light" | "dark";
  action?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({
  onToken,
  theme = "light",
  action,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || !siteKey) return;
    if (widgetIdRef.current !== null) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      size: "invisible",
      theme,
      action,
      callback: (token: string) => {
        if (hiddenInputRef.current) hiddenInputRef.current.value = token;
        onToken?.(token);
      },
      "expired-callback": () => {
        if (hiddenInputRef.current) hiddenInputRef.current.value = "";
        if (widgetIdRef.current !== null) {
          window.turnstile?.reset(widgetIdRef.current);
        }
      },
      "error-callback": () => {
        if (hiddenInputRef.current) hiddenInputRef.current.value = "";
      },
    });
  }, [siteKey, theme, action, onToken]);

  useEffect(() => {
    if (window.turnstile) renderWidget();
    return () => {
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} />
      <input type="hidden" name="captchaToken" ref={hiddenInputRef} />
    </>
  );
}
