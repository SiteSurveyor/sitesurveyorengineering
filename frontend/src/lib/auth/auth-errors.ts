function authErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  if (error instanceof Error) return error.message;
  return "";
}

function authErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

/** User-facing copy when Supabase Auth hits email / OTP rate limits (429). */
export function formatAuthRateLimitMessage(error: unknown): string | null {
  const raw = authErrorMessage(error);
  const msg = raw.toLowerCase();
  const status = authErrorStatus(error);

  if (
    status !== 429 &&
    !msg.includes("rate limit") &&
    !msg.includes("too many requests")
  ) {
    return null;
  }

  return (
    "Email sending is temporarily limited (Supabase caps how many confirmation or reset emails " +
    "can go out per hour on the built-in mailer). Wait about an hour and try again, or configure " +
    "custom SMTP under Supabase Dashboard → Authentication → Emails → SMTP Settings for higher limits."
  );
}

/** Prefer rate-limit explanation; otherwise return the original error message. */
export function formatAuthUserFacingError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const rate = formatAuthRateLimitMessage(error);
  if (rate) return rate;
  const raw = authErrorMessage(error).trim();
  if (raw) return raw;
  return fallback;
}
