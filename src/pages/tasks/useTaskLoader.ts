import { useCallback, useEffect, useState } from 'react';
import { getTask, normalizeFetchError, type ApiTask } from '../../lib/api';

export function useTaskLoader(token: string | null | undefined, taskId: number | null) {
  const [task, setTask] = useState<ApiTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (taskId == null) {
      setLoading(false);
      setTask(null);
      setError(null);
      return;
    }
    if (!token) {
      setLoading(false);
      setTask(null);
      setError('Not signed in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getTask(token, taskId);
      setTask(data);
    } catch (e) {
      setError(normalizeFetchError(e, 'Failed to load task'));
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [token, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { task, loading, error, reload: load };
}
