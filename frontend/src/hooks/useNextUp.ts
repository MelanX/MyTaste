import { useCallback, useEffect, useState } from 'react';
import { addToNextUp, clearNextUp, fetchNextUp, removeFromNextUp } from '../utils/api_service';

export function useNextUp() {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNextUp()
      .then((data) => {
        if (!cancelled) {
          setIds(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(async (id: string) => {
    const updated = await addToNextUp(id);
    setIds(updated);
  }, []);

  const remove = useCallback(async (id: string) => {
    const updated = await removeFromNextUp(id);
    setIds(updated);
  }, []);

  const clear = useCallback(async () => {
    await clearNextUp();
    setIds([]);
  }, []);

  return { ids, loading, error, add, remove, clear };
}
