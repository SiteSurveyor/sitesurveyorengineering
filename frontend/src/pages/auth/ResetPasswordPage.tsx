import { useEffect, useState } from "react";
import { getCurrentSession, updatePassword } from "../../lib/auth/session.ts";
import "../../styles/auth.css";

interface ResetPasswordPageProps {
  onGoToLogin: () => void;
}

export default function ResetPasswordPage({
  onGoToLogin,
}: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isRecoveryValid, setIsRecoveryValid] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getCurrentSession();
        setIsRecoveryValid(Boolean(session));
      } catch {
        setIsRecoveryValid(false);
      } finally {
        setCheckingSession(false);
      }
    };
    void checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(password);
      setNotice("Password updated successfully. You can now log in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset password. Request a new reset link and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="auth-tagline">Checking reset session...</p>
        </div>
      </div>
    );
  }

  if (!isRecoveryValid) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-header">
            <img src="/logo.svg" alt="SiteSurveyor" className="auth-logo" />
            <h1 className="auth-brand">Reset Link Invalid</h1>
            <p className="auth-tagline">
              This reset link is invalid or expired. Request a new one.
            </p>
          </div>
          <button className="auth-btn auth-btn-primary" onClick={onGoToLogin}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.svg" alt="SiteSurveyor" className="auth-logo" />
          <h1 className="auth-brand">Set New Password</h1>
          <p className="auth-tagline">Choose a secure password for your account.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
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
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-input"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-success">{notice}</p>}

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Password"}
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
