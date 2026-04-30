import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Notation, getNotation, setNotation as persistNotation } from "./storage";

interface NotationContextValue {
  notation: Notation;
  setNotation: (n: Notation) => void;
  ready: boolean;
}

const NotationContext = createContext<NotationContextValue>({
  notation: "english",
  setNotation: () => {},
  ready: false,
});

export function NotationProvider({ children }: { children: ReactNode }) {
  const [notation, setNotationState] = useState<Notation>("english");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void getNotation().then((n) => {
      if (!alive) return;
      setNotationState(n);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setNotation = useCallback((n: Notation) => {
    setNotationState(n);
    void persistNotation(n);
  }, []);

  return (
    <NotationContext.Provider value={{ notation, setNotation, ready }}>
      {children}
    </NotationContext.Provider>
  );
}

export function useNotation() {
  return useContext(NotationContext);
}
