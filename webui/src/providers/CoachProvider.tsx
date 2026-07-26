import { createContext, useContext, type ReactNode } from "react";

import type { CoachStateApi } from "@/hooks/useCoachState";

const CoachContext = createContext<CoachStateApi | null>(null);

export function CoachProvider({
  value,
  children,
}: {
  value: CoachStateApi;
  children: ReactNode;
}) {
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoach(): CoachStateApi {
  const ctx = useContext(CoachContext);
  if (!ctx) {
    throw new Error("useCoach must be used within a CoachProvider");
  }
  return ctx;
}

export function useCoachOptional(): CoachStateApi | null {
  return useContext(CoachContext);
}
