import { useState, useCallback, useEffect } from "react";
import SplashScreen from "./components/SplashScreen";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import { getCurrentAppUser } from "./lib/auth/app-user.ts";
import {
  getCurrentSession,
  onAuthStateChange,
  signOut as signOutSession,
} from "./lib/auth/session.ts";
import { mapAppUserToUiUser } from "./features/workspace/account.ts";
import type { UiUser } from "./features/workspace/types.ts";
import PersonalWorkspaceShell from "./features/personal/PersonalWorkspaceShell";
import BusinessWorkspaceShell from "./features/business/BusinessWorkspaceShell";

type AuthPage = "login" | "signup" | "forgot" | "resetPassword";

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

    const appUser = await getCurrentAppUser();
    const mappedUser = mapAppUserToUiUser(appUser);

    if (!mappedUser) {
      throw new Error(
        "Your account is authenticated, but your profile or workspace is not ready yet. Please try again in a moment.",
      );
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

        const appUser = await getCurrentAppUser();
        if (!isMounted) return;

        setUser(mapAppUserToUiUser(appUser));
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
  }, []);

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

  if (user.accountType === "business") {
    return <BusinessWorkspaceShell user={user} onLogout={handleLogout} />;
  }

  return <PersonalWorkspaceShell user={user} onLogout={handleLogout} />;
}

export default App;
