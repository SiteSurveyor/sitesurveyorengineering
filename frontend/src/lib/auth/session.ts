import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client.ts";

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  accountType: "personal" | "business" | "platform_admin";
  workspaceName?: string;
  company?: string;
  promoCode?: string;
}

export interface SignUpResult {
  session: Session | null;
  user: User | null;
  needsEmailConfirmation: boolean;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signInWithEmail({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(
  input: SignUpInput,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        account_type: input.accountType,
        workspace_name: input.workspaceName ?? input.company ?? null,
        company: input.company ?? null,
        promo_code: input.promoCode ?? null,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    session: data.session,
    user: data.user,
    needsEmailConfirmation: data.session === null,
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/?auth=reset-password`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  return data;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}
