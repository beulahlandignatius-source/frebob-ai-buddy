// React context that reflects demo mode state and exposes controls.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  enterDemoMode,
  exitDemoMode,
  resetDemoMode,
  isDemoMode,
  subscribeDemoMode,
  DEMO_BUSINESS,
} from "./mode";

type Ctx = {
  active: boolean;
  enter: () => void;
  exit: () => void;
  reset: () => void;
  business: typeof DEMO_BUSINESS;
};

const DemoContext = createContext<Ctx>({
  active: false,
  enter: () => {},
  exit: () => {},
  reset: () => {},
  business: DEMO_BUSINESS,
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isDemoMode());
    const unsub = subscribeDemoMode(setActive);
    return unsub;
  }, []);

  return (
    <DemoContext.Provider
      value={{
        active,
        enter: enterDemoMode,
        exit: exitDemoMode,
        reset: resetDemoMode,
        business: DEMO_BUSINESS,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
