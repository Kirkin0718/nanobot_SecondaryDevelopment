import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  fetchCoachState,
  type CoachStatePayload,
} from "@/lib/api";
import { useClient } from "@/providers/ClientProvider";

/** Soft refresh reuses a fresh payload within this window. */
export const COACH_TTL_MS = 10_000;
/** Collapse bursty turn-end refreshes. */
export const COACH_TURN_END_DEBOUNCE_MS = 300;

export type CoachRefreshOptions = {
  /** Bypass TTL and always hit the network (after check-in / known stale). */
  force?: boolean;
};

export interface CoachStateApi {
  sessionKey: string | null;
  coach: CoachStatePayload | null;
  loading: boolean;
  error: string | null;
  refresh: (opts?: CoachRefreshOptions) => Promise<CoachStatePayload | null>;
  /** Debounced soft refresh for turn-end / bursty events. */
  refreshSoon: () => void;
  setCoach: Dispatch<SetStateAction<CoachStatePayload | null>>;
}

/**
 * Shared coach payload for a session (progress, notes, check-in days).
 * Mount once per ThreadShell and pass through CoachProvider.
 *
 * Performance: in-flight dedupe + short TTL so Notes/Checkin/Progress
 * opening in sequence does not stampede GET /coach.
 */
export function useCoachState(sessionKey: string | null): CoachStateApi {
  const { token } = useClient();
  const [coach, setCoach] = useState<CoachStatePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coachRef = useRef<CoachStatePayload | null>(null);
  const lastFetchedAtRef = useRef(0);
  const inFlightRef = useRef<Promise<CoachStatePayload | null> | null>(null);
  const soonTimerRef = useRef<number | null>(null);
  const sessionKeyRef = useRef(sessionKey);
  sessionKeyRef.current = sessionKey;
  coachRef.current = coach;

  const refresh = useCallback(async (opts?: CoachRefreshOptions) => {
    const key = sessionKeyRef.current;
    if (!key) {
      setCoach(null);
      setError(null);
      setLoading(false);
      lastFetchedAtRef.current = 0;
      inFlightRef.current = null;
      return null;
    }

    const force = opts?.force === true;
    const age = Date.now() - lastFetchedAtRef.current;
    if (!force && coachRef.current && age >= 0 && age < COACH_TTL_MS) {
      return coachRef.current;
    }
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setLoading(true);
    const pending = (async () => {
      try {
        const payload = await fetchCoachState(token, key);
        // Drop late responses after session switch.
        if (sessionKeyRef.current !== key) return null;
        setCoach(payload);
        coachRef.current = payload;
        lastFetchedAtRef.current = Date.now();
        setError(null);
        return payload;
      } catch (e) {
        if (sessionKeyRef.current === key) {
          setError(e instanceof Error ? e.message : String(e));
        }
        return null;
      } finally {
        if (sessionKeyRef.current === key) setLoading(false);
        if (inFlightRef.current === pending) inFlightRef.current = null;
      }
    })();
    inFlightRef.current = pending;
    return pending;
  }, [token]);

  const refreshSoon = useCallback(() => {
    if (soonTimerRef.current !== null) {
      window.clearTimeout(soonTimerRef.current);
    }
    soonTimerRef.current = window.setTimeout(() => {
      soonTimerRef.current = null;
      void refresh({ force: true });
    }, COACH_TURN_END_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    lastFetchedAtRef.current = 0;
    inFlightRef.current = null;
    void refresh({ force: true });
    return () => {
      if (soonTimerRef.current !== null) {
        window.clearTimeout(soonTimerRef.current);
        soonTimerRef.current = null;
      }
    };
  }, [refresh, sessionKey]);

  return {
    sessionKey,
    coach,
    loading,
    error,
    refresh,
    refreshSoon,
    setCoach,
  };
}
