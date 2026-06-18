"use client";

import Script from "next/script";

// Renders the Cloudflare Turnstile widget when a site key is configured. The
// Turnstile script auto-injects a hidden input named "cf-turnstile-response"
// into the surrounding <form>, which the form's FormData then submits.
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </div>
  );
}
