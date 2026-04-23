import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface TabBarCtx {
  hidden: boolean;
  setHidden: (v: boolean) => void;
}

const Ctx = createContext<TabBarCtx>({
  hidden: false,
  setHidden: () => {},
});

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState(false);
  const setHidden = useCallback((v: boolean) => setHiddenState(v), []);
  return <Ctx.Provider value={{ hidden, setHidden }}>{children}</Ctx.Provider>;
}

export function useTabBarVisibility(): TabBarCtx {
  return useContext(Ctx);
}
