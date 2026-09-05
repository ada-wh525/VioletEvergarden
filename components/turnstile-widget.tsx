"use client";

import { useEffect, useRef, useState } from "react";

type WidgetState = "loading" | "ready" | "verified" | "error";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-violet-turnstile="true"]');
    const script = existing ?? document.createElement("script");
    const finish = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not initialize"));

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile could not load")), { once: true });
    if (!existing) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.violetTurnstile = "true";
      document.head.appendChild(script);
    }
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export function TurnstileWidget({
  onToken,
  onStateChange,
}: {
  onToken: (token: string | null) => void;
  onStateChange: (state: WidgetState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<WidgetState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let widgetId: string | null = null;

    const updateState = (nextState: WidgetState) => {
      if (!active) return;
      setState(nextState);
      onStateChange(nextState);
    };

    const initialize = async () => {
      updateState("loading");
      onToken(null);

      try {
        const configResponse = await fetch("/api/turnstile-config", {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!configResponse.ok) throw new Error("Turnstile is not configured");
        const { siteKey } = (await configResponse.json()) as { siteKey?: string };
        if (!siteKey) throw new Error("Turnstile site key is missing");

        const turnstile = await loadTurnstile();
        if (!active || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "submit_letter",
          theme: "light",
          size: "flexible",
          callback: (token: string) => {
            onToken(token);
            updateState("verified");
          },
          "expired-callback": () => {
            onToken(null);
            updateState("ready");
          },
          "timeout-callback": () => {
            onToken(null);
            updateState("ready");
          },
          "error-callback": () => {
            onToken(null);
            updateState("error");
          },
        });
        updateState("ready");
      } catch {
        updateState("error");
      }
    };

    void initialize();
    return () => {
      active = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [attempt, onStateChange, onToken]);

  return (
    <div className={`turnstile-gate is-${state}`}>
      <div className="turnstile-widget-host" ref={containerRef} />
      {state === "loading" && <p>正在连接安全验证</p>}
      {state === "verified" && <p>验证完成，可以投递。</p>}
      {state === "error" && (
        <div className="turnstile-error" role="alert">
          <p>安全验证暂时没有加载成功。</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>重新加载验证</button>
        </div>
      )}
    </div>
  );
}
