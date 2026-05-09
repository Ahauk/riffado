import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  Notation,
  getNotation,
  getShowCapo,
  getShowDegrees,
  setNotation as persistNotation,
  setShowCapo as persistShowCapo,
  setShowDegrees as persistShowDegrees,
} from "./storage";

interface SettingsContextValue {
  notation: Notation;
  setNotation: (n: Notation) => void;
  showDegrees: boolean;
  setShowDegrees: (v: boolean) => void;
  showCapo: boolean;
  setShowCapo: (v: boolean) => void;
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  notation: "english",
  setNotation: () => {},
  showDegrees: true,
  setShowDegrees: () => {},
  showCapo: true,
  setShowCapo: () => {},
  ready: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [notation, setNotationState] = useState<Notation>("english");
  const [showDegrees, setShowDegreesState] = useState(true);
  const [showCapo, setShowCapoState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([getNotation(), getShowDegrees(), getShowCapo()]).then(
      ([n, d, c]) => {
        if (!alive) return;
        setNotationState(n);
        setShowDegreesState(d);
        setShowCapoState(c);
        setReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const setNotation = useCallback((n: Notation) => {
    setNotationState(n);
    void persistNotation(n);
  }, []);

  const setShowDegrees = useCallback((v: boolean) => {
    setShowDegreesState(v);
    void persistShowDegrees(v);
  }, []);

  const setShowCapo = useCallback((v: boolean) => {
    setShowCapoState(v);
    void persistShowCapo(v);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        notation,
        setNotation,
        showDegrees,
        setShowDegrees,
        showCapo,
        setShowCapo,
        ready,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/**
 * Compatibility hook for call sites that only need the notation slice.
 * Internally reads from the same SettingsContext.
 */
export function useNotation() {
  const { notation, setNotation, ready } = useContext(SettingsContext);
  return { notation, setNotation, ready };
}
