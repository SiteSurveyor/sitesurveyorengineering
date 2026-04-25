import { useState, useEffect } from "react";
import {
  getMyProfile,
  updateMyProfile,
} from "../../lib/repositories/profiles.ts";
import { useThemeMode } from "../../lib/theme.ts";
import "../../styles/pages.css";

export default function ProfileSettingsPage() {
  const { isDarkMode, setThemeMode } = useThemeMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        if (profile) {
          setFullName(profile.full_name ?? "");
          setProfessionalTitle(profile.professional_title ?? "");
          setPromoCode(profile.promo_code ?? "");
          setBio(profile.bio ?? "");
          setEmail(profile.email ?? "");
          setPhone(profile.phone ?? "");
        }
      })
      .catch((err) => setError(err.message ?? "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({
        full_name: fullName.trim() || null,
        professional_title: professionalTitle.trim() || null,
        promo_code: promoCode.trim() || null,
        bio: bio.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      setNotice("Profile saved.");
      window.setTimeout(() => setNotice(null), 2300);
    } catch (err: any) {
      setError(err.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  if (loading) {
    return (
      <div className="hub-body">
        <p style={{ padding: "2rem" }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="hub-body">
      {error && (
        <div
          style={{
            background: "var(--danger-bg, #fee)",
            color: "var(--danger, #c00)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}
      {notice && <div className="alert-bar alert-warning">{notice}</div>}

      <header
        className="page-header"
        style={{ padding: 0, marginBottom: "24px" }}
      >
        <div>
          <h1>Profile Settings</h1>
          <p className="page-subtitle">
            Manage your personal information, licensing, and account security
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <div className="settings-layout">
        <div className="card settings-card">
          <h2 className="settings-section-title">Edit Information</h2>
          <div className="settings-group">
            <div className="setting-row" style={{ alignItems: "center" }}>
              <div className="setting-info">
                <span className="setting-label">Profile Avatar</span>
                <span className="setting-desc">
                  Upload a picture to replace your initials
                </span>
              </div>
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <div
                  className="hub-avatar-btn"
                  style={{
                    width: "48px",
                    height: "48px",
                    fontSize: "20px",
                    cursor: "default",
                    transform: "none",
                    boxShadow: "none",
                  }}
                >
                  {initials}
                </div>
                <button
                  className="btn btn-outline"
                  style={{ padding: "6px 12px" }}
                >
                  Upload Photo
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Full Name</span>
                <span className="setting-desc">
                  Your legal or professional name
                </span>
              </div>
              <input
                className="setting-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Professional Title</span>
                <span className="setting-desc">
                  E.g., Registered Land Surveyor, Party Chief
                </span>
              </div>
              <input
                className="setting-input"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Promo / Referral Code</span>
                <span className="setting-desc">
                  Optional code for promotions and referral tracking
                </span>
              </div>
              <input
                className="setting-input"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </div>

            <div className="setting-row" style={{ alignItems: "flex-start" }}>
              <div className="setting-info">
                <span className="setting-label">Professional Bio</span>
                <span className="setting-desc">
                  Brief summary of your skills and experience
                </span>
              </div>
              <textarea
                className="setting-input"
                style={{
                  minHeight: "80px",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card settings-card">
          <h2 className="settings-section-title">
            Account Security & Notifications
          </h2>
          <div className="settings-group">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Email Address</span>
                <span className="setting-desc">
                  Used for login and notifications
                </span>
              </div>
              <input
                className="setting-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Phone Number</span>
                <span className="setting-desc">For 2FA and field contact</span>
              </div>
              <input
                className="setting-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Dark Mode</span>
                <span className="setting-desc">
                  Use a darker interface optimized for low-light work
                </span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={(e) =>
                    setThemeMode(e.target.checked ? "dark" : "light")
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">
                  Two-Factor Authentication (2FA)
                </span>
                <span className="setting-desc">
                  Require an SMS code when logging in
                </span>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Email Notifications</span>
                <span className="setting-desc">
                  Receive updates about calibration alerts and project invites
                </span>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label" style={{ color: "#c62828" }}>
                  Change Password
                </span>
                <span className="setting-desc">
                  Send a secure magic link to reset your password
                </span>
              </div>
              <button
                className="btn btn-outline"
                style={{ color: "#c62828", borderColor: "#fbcfe8" }}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
