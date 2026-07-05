import Link from "next/link";
import { GithubSignInButton } from "@/components/github-sign-in-button";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string;
    error?: string;
  };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrl = searchParams?.callbackUrl ?? "/dashboard";
  const error = searchParams?.error;
  const errorMessage =
    error === "github"
      ? "GitHub OAuth failed. For local testing, the GitHub OAuth App callback must be http://localhost:3000/api/auth/callback/github exactly. If your GitHub app is set to the Vercel URL only, local sign-in will fail."
      : error
        ? `Sign-in error: ${error}`
        : null;

  return (
    <main className="shell fade-in-section" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <section className="panel stack" style={{ maxWidth: 480, width: "100%", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="stack" style={{ gap: 12, textAlign: "center" }}>
          <span className="eyebrow" style={{ margin: "0 auto" }}>Sign In</span>
          <h2 style={{ fontSize: "1.8rem", margin: "8px 0 0", fontWeight: 700 }}>Welcome Back</h2>
          <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
            Access the bot dashboard to configure event routing and monitor automated writebacks.
          </p>
        </div>
        {errorMessage ? (
          <div style={{ color: "var(--danger)", background: "var(--danger-bg)", padding: 14, borderRadius: "12px", border: "1px solid rgba(229, 72, 77, 0.15)", fontSize: "0.85rem", lineHeight: 1.4 }}>
            {errorMessage}
          </div>
        ) : null}
        <div className="stack" style={{ gap: 12 }}>
          <GithubSignInButton callbackUrl={callbackUrl} />
          <Link className="button secondary" href="/" style={{ width: "100%", textAlign: "center" }}>
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}