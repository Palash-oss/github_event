"use client";

import { useState } from "react";
import { getCsrfToken } from "next-auth/react";

type GithubSignInButtonProps = {
  callbackUrl: string;
};

export function GithubSignInButton({ callbackUrl }: GithubSignInButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        throw new Error("Unable to get CSRF token");
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/github";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = callbackUrl;
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      className="button primary"
      type="button"
      style={{ width: "100%", justifyContent: "center" }}
      onClick={() => void handleClick()}
      disabled={isSubmitting}
      suppressHydrationWarning
    >
      {isSubmitting ? "Connecting..." : "Continue with GitHub"}
    </button>
  );
}