"use client";

import { createContext, useContext, useEffect, useState } from "react";

const HiddenContext = createContext(false);
const SetHiddenContext = createContext<(hidden: boolean) => void>(() => {});

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <SetHiddenContext.Provider value={setHidden}>
      <HiddenContext.Provider value={hidden}>{children}</HiddenContext.Provider>
    </SetHiddenContext.Provider>
  );
}

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const hidden = useContext(HiddenContext);
  if (hidden) return null;
  return children;
}

export function useTestChrome(hidden: boolean) {
  const setHidden = useContext(SetHiddenContext);
  useEffect(() => {
    setHidden(hidden);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}
