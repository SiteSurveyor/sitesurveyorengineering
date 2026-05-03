import { useState } from "react";
import { formatAuthUserFacingError } from "../../lib/auth/auth-errors.ts";
import { requestPasswordReset } from "../../lib/auth/session.ts";
import "../../styles/auth.css";

interface ForgotPasswordPageProps {
  onGoToLogin: () => void;
}

export default function ForgotPasswordPage({
  onGoToLogin,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPasswordReset(email.trim());
      setNotice(
        "Password reset link sent. Check your email and open the link to continue.",
      );
    } catch (err) {
      setError(
        formatAuthUserFacingError(
          err,
          "Unable to send reset link. Please try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.svg" alt="SiteSurveyor" className="auth-logo" />
          <h1 className="auth-brand">Reset Password</h1>
          <p className="auth-tagline">
            Enter your email and we will send a reset link.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-success">{notice}</p>}

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-footer">
          <button className="auth-footer-link" onClick={onGoToLogin}>
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
