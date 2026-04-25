import { useEffect, useState } from "react";
import { supabase } from "./supabase/client.ts";

export type ServerStatus = "checking" | "online" | "offline";

const STATUS_POLL_MS = 30000;

function isLikelyOfflineError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error ?? "").toLowerCase();

  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("fetch")
  );
}

async function checkSupabaseReachable(signal?: AbortSignal): Promise<boolean> {
  const query = supabase.from("workspaces").select("id").limit(1);
  const { error } = signal ? await query.abortSignal(signal) : await query;

  if (!error) return true;
  if (isLikelyOfflineError(error)) return false;
  return true;
}

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    let mounted = true;
    let pendingController: AbortController | null = null;

    const runCheck = async () => {
      if (!mounted) return;
      pendingController?.abort();
      pendingController = new AbortController();
      const timeoutId = window.setTimeout(
        () => pendingController?.abort(),
        8000,
      );

      try {
        const reachable = await checkSupabaseReachable(
          pendingController.signal,
        );
        if (mounted) {
          setStatus(reachable ? "online" : "offline");
        }
      } catch {
        if (mounted) setStatus("offline");
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const onVisibility = () => {
      if (!document.hidden) runCheck();
    };

    runCheck();
    const intervalId = window.setInterval(runCheck, STATUS_POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", runCheck);
    window.addEventListener("offline", runCheck);

    return () => {
      mounted = false;
      pendingController?.abort();
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", runCheck);
      window.removeEventListener("offline", runCheck);
    };
  }, []);

  return status;
}
