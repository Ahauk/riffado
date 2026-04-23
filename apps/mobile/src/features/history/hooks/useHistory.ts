import { useCallback, useEffect, useState } from "react";

import {
  HistoryItem,
  loadHistory,
  removeAnalysis,
} from "../storage";

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const fresh = await loadHistory();
    setItems(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await removeAnalysis(id);
      await refresh();
    },
    [refresh]
  );

  return { items, loading, refresh, remove };
}
