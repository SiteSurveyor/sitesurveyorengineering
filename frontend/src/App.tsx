import { useState, useCallback, useEffect } from "react";
import SplashScreen from "./components/SplashScreen";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import {
  getCurrentAppUserWithDiagnostics,
  type AppUserLoadDiagnostics,
} from "./lib/auth/app-user.ts";
import {
  getCurrentSession,
  onAuthStateChange,
  signOut as signOutSession,
} from "./lib/auth/session.ts";
import { mapAppUserToUiUser } from "./features/workspace/account.ts";
import type { UiUser } from "./features/workspace/types.ts";
import PersonalWorkspaceShell from "./features/personal/PersonalWorkspaceShell";
import BusinessWorkspaceShell from "./features/business/BusinessWorkspaceShell";
import PlatformOperatorWorkspaceShell from "./features/platform/PlatformOperatorWorkspaceShell";

type AuthPage = "login" | "signup" | "forgot" | "resetPassword";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function anyFetchFailed(d: AppUserLoadDiagnostics): boolean {
  return (
    d.profileFetchFailed ||
    d.defaultWorkspaceFetchFailed ||
    d.workspacesFetchFailed
  );
}

function workspaceNotReadyMessage(diagnostics: AppUserLoadDiagnostics): string {
  if (anyFetchFailed(diagnostics)) {
    return (
      "We could not load your profile or workspace (connection or server error). " +
      "Check your network and try signing in again. If this continues, contact support."
    );
  }
  const base =
    "Your workspace is still being set up, or your account is missing a workspace. " +
    "Please try signing in again in a few seconds. " +
    "If this keeps happening, sign out and contact an administrator to verify your account in the database.";
  if (import.meta.env.DEV) {
    return `${base} (Dev: check Supabase profile.default_workspace_id and workspace_members.)`;
  }
  return base;
}

/** Four attempts with waits 0 / 400ms / 1s / 2s between rounds (handles trigger lag). */
async function mapUserWithRetries(): Promise<{
  user: UiUser | null;
  diagnostics: AppUserLoadDiagnostics;
}> {
  const delaysBeforeRetryMs = [400, 1000, 2000];
  let lastDiagnostics: AppUserLoadDiagnostics = {
    profileFetchFailed: false,
    defaultWorkspaceFetchFailed: false,
    workspacesFetchFailed: false,
  };

  const attempts = 1 + delaysBeforeRetryMs.length;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await sleep(delaysBeforeRetryMs[attempt - 1]);
    }

    const { context, diagnostics } = await getCurrentAppUserWithDiagnostics();
    lastDiagnostics = diagnostics;
    const mapped = mapAppUserToUiUser(context);
    if (mapped) {
      return { user: mapped, diagnostics };
    }
  }

  return { user: null, diagnostics: lastDiagnostics };
}

function App() {
  const isPasswordRecoveryLink = useCallback(() => {
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      search.includes("auth=reset-password") || hash.includes("type=recovery")
    );
  }, []);

  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<UiUser | null>(null);
  const [authPage, setAuthPage] = useState<AuthPage>("login");

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const syncAuthenticatedUser = useCallback(async () => {
    const session = await getCurrentSession();

    if (!session) {
      setUser(null);
      return;
    }

    const { user: mappedUser, diagnostics } = await mapUserWithRetries();

    if (!mappedUser) {
      throw new Error(workspaceNotReadyMessage(diagnostics));
    }

    setUser(mappedUser);
  }, []);

  const handleLoginSuccess = useCallback(async () => {
    await syncAuthenticatedUser();
  }, [syncAuthenticatedUser]);

  const handleSignupComplete = useCallback(async () => {
    await handleLoginSuccess();
  }, [handleLoginSuccess]);

  const handleLogout = useCallback(async () => {
    await signOutSession();
    setUser(null);
    setAuthPage("login");
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncUser = async () => {
      try {
        if (isPasswordRecoveryLink()) {
          setAuthPage("resetPassword");
        }
        const session = await getCurrentSession();
        if (!isMounted) return;

        if (!session) {
          setUser(null);
          return;
        }

        const { user: mappedUser } = await mapUserWithRetries();
        if (!isMounted) return;

        setUser(mappedUser);
      } catch {
        if (isMounted) {
          setUser(null);
        }
      }
    };

    void syncUser();

    const subscription = onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthPage("resetPassword");
      }
      void syncUser();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isPasswordRecoveryLink]);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (!user) {
    if (authPage === "signup") {
      return (
        <SignupPage
          onSignup={handleSignupComplete}
          onGoToLogin={() => setAuthPage("login")}
        />
      );
    }

    if (authPage === "forgot") {
      return <ForgotPasswordPage onGoToLogin={() => setAuthPage("login")} />;
    }

    if (authPage === "resetPassword") {
      return <ResetPasswordPage onGoToLogin={() => setAuthPage("login")} />;
    }

    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onGoToSignup={() => setAuthPage("signup")}
        onForgotPassword={() => setAuthPage("forgot")}
      />
    );
  }

  if (user.signupAccountType === "platform_admin") {
    return (
      <PlatformOperatorWorkspaceShell user={user} onLogout={handleLogout} />
    );
  }

  if (user.accountType === "business") {
    return <BusinessWorkspaceShell user={user} onLogout={handleLogout} />;
  }

  return <PersonalWorkspaceShell user={user} onLogout={handleLogout} />;
}

export default App;
