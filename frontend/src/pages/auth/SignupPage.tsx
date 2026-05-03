import { useState } from "react";
import { formatAuthUserFacingError } from "../../lib/auth/auth-errors.ts";
import { signUpWithEmail } from "../../lib/auth/session.ts";
import "../../styles/auth.css";

interface SignupPageProps {
  onSignup: () => Promise<void> | void;
  onGoToLogin: () => void;
}

function getPasswordStrength(pw: string): {
  level: number;
  label: string;
  key: string;
} {
  if (!pw) return { level: 0, label: "", key: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak", key: "weak" };
  if (score === 2) return { level: 2, label: "Fair", key: "fair" };
  if (score === 3) return { level: 3, label: "Good", key: "good" };
  return { level: 4, label: "Strong", key: "strong" };
}

export default function SignupPage({ onSignup, onGoToLogin }: SignupPageProps) {
  const [step, setStep] = useState<"type" | "details">("type");
  const [accountType, setAccountType] = useState<
    "personal" | "business" | "platform_admin" | null
  >(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!fullName || !email || !password || !confirmPassword || !accountType) {
      setError("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedCompany =
        accountType === "personal"
          ? "Independent Surveyor"
          : accountType === "platform_admin"
            ? company.trim() ||
              `${fullName.trim().split(/\s+/)[0] || "Admin"} — SiteSurveyor Admin`
            : company.trim() || "My Company";

      const workspaceNameForSignup =
        accountType === "business"
          ? normalizedCompany
          : accountType === "platform_admin"
            ? normalizedCompany
            : undefined;

      const result = await signUpWithEmail({
        email,
        password,
        fullName,
        accountType,
        workspaceName: workspaceNameForSignup,
        company: normalizedCompany,
        promoCode: promoCode || undefined,
      });

      if (result.needsEmailConfirmation) {
        setSuccessMessage(
          accountType === "platform_admin"
            ? "Account created. Confirm your email, then sign in. A SiteSurveyor super-admin must still enable platform operator access for your user before the Platform section appears in the app."
            : "Account created. Check your email to confirm your account, then sign in.",
        );
        setTimeout(() => onGoToLogin(), 1200);
        return;
      }

      await onSignup();
    } catch (err) {
      setError(formatAuthUserFacingError(err, "Unable to create account."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Account type selection
  if (step === "type") {
    return (
      <div className="auth-screen">
        <div className="auth-card auth-card-wide">
          <div className="auth-header">
            <img src="/logo.svg" alt="SiteSurveyor" className="auth-logo" />
            <h1 className="auth-brand">SiteSurveyor for Engineers</h1>
            <p className="auth-tagline">Choose how you'll use SiteSurveyor</p>
          </div>

          <div className="account-type-grid">
            <button
              type="button"
              className={`account-type-card ${accountType === "personal" ? "selected" : ""}`}
              onClick={() => setAccountType("personal")}
            >
              <div className="account-type-icon personal">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3>Personal account</h3>
              <ul className="account-type-features">
                <li>My Projects & Field Data</li>
                <li>Personal Equipment Tracker</li>
                <li>Quotes & Invoicing</li>
                <li>Job Board Access</li>
              </ul>
            </button>

            <button
              type="button"
              className={`account-type-card ${accountType === "business" ? "selected" : ""}`}
              onClick={() => setAccountType("business")}
            >
              <div className="account-type-icon business">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Business account</h3>
              <ul className="account-type-features">
                <li>Everything in Personal, plus:</li>
                <li>Team & Crew Management</li>
                <li>Dispatch Board & Scheduling</li>
                <li>Analytics & Business Intelligence</li>
              </ul>
            </button>

            <button
              className={`account-type-card ${accountType === "platform_admin" ? "selected" : ""}`}
              type="button"
              onClick={() => setAccountType("platform_admin")}
            >
              <div className="account-type-icon platform-admin">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Platform administration</h3>
              <ul className="account-type-features">
                <li>Platform console &amp; all workspaces</li>
                <li>License allocation &amp; tenant oversight</li>
                <li>Global license activity &amp; audit</li>
                <li>For trusted operators only</li>
              </ul>
            </button>
          </div>

          <button
            className="auth-btn auth-btn-primary"
            disabled={!accountType}
            onClick={() => setStep("details")}
            style={{ marginTop: "24px", opacity: accountType ? 1 : 0.5 }}
          >
            Continue
          </button>

          <div className="auth-footer">
            Already have an account?{" "}
            <button className="auth-footer-link" onClick={onGoToLogin}>
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Details form
  return (
    <div className="auth-screen">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <img src="/logo.svg" alt="SiteSurveyor" className="auth-logo" />
          <h1 className="auth-brand">SiteSurveyor for Engineers</h1>
          <p className="auth-tagline">
            {accountType === "personal"
              ? "Set up your personal workspace"
              : accountType === "platform_admin"
                ? "Create your platform operator account"
                : "Register your surveying firm"}
          </p>
        </div>

        <button className="auth-back-btn" onClick={() => setStep("type")}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Change account type
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Tendai Moyo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@company.co.zw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-form-row">
            {accountType === "business" ? (
              <div className="form-group">
                <label className="form-label">Company / Firm Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="GeoDeZ Surveyors (Pvt) Ltd"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>
            ) : accountType === "platform_admin" ? (
              <div className="form-group">
                <label className="form-label">
                  Organization label{" "}
                  <span className="form-label-optional">(optional)</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="SiteSurveyor Operations"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  Trading Name{" "}
                  <span className="form-label-optional">(optional)</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="T. Moyo Land Surveys"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">
                Promo / Referral Code{" "}
                <span className="form-label-optional">(optional)</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Early access code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              {/* Keep in sync with seed rows in supabase/migrations/20260504120000_monetisation_billing_limits_promo_marketplace.sql */}
              <p className="form-hint" style={{ marginTop: "0.35rem" }}>
                Campaign examples (when enabled on the server):{" "}
                <strong>EARLYBIRD</strong>, <strong>FIELDCREW</strong>.
              </p>
            </div>
          </div>

          {accountType === "platform_admin" && (
            <div className="auth-admin-signup-notice" role="note">
              <strong>Trusted operators only.</strong> You are registering a
              standard user account. Platform-wide operator privileges (licenses,
              all workspaces, audit) are granted by a SiteSurveyor super-admin
              after your account exists—this form does not turn those privileges
              on by itself.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-wrapper">
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {password && (
              <>
                <div className="password-strength">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`strength-bar ${i <= strength.level ? `filled ${strength.key}` : ""}`}
                    />
                  ))}
                </div>
                <span className={`strength-text ${strength.key}`}>
                  {strength.label}
                </span>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-input"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {successMessage && <p className="form-success">{successMessage}</p>}

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Creating Account..."
              : accountType === "platform_admin"
                ? "Create platform administration account"
                : `Create ${accountType === "business" ? "Business" : "Personal"} Account`}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <button className="auth-footer-link" onClick={onGoToLogin}>
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
