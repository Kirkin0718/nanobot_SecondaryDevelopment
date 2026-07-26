import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  fetchCoachState,
  type CoachStatePayload,
} from "@/lib/api";
import { useClient } from "@/providers/ClientProvider";

export interface CoachStateApi {
  sessionKey: string | null;
  coach: CoachStatePayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<CoachStatePayload | null>;
  setCoach: Dispatch<SetStateAction<CoachStatePayload | null>>;
}

/**
 * Shared coach payload for a session (progress, notes, check-in days).
 * Mount once per ThreadShell and pass through CoachProvider.
 */
export function useCoachState(sessionKey: string | null): CoachStateApi {
  const { token } = useClient();
  const [coach, setCoach] = useState<CoachStatePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionKey) {
      setCoach(null);
      setError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const payload = await fetchCoachState(token, sessionKey);
      setCoach(payload);
      setError(null);
      return payload;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionKey, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    sessionKey,
    coach,
    loading,
    error,
    refresh,
    setCoach,
  };
}
