import { useCallback, useEffect, useState, type DependencyList } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs an async loader whenever deps change; ignores results from stale runs.
 * Errors are kept (never swallowed) so screens can show an error state.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error: unknown; loading: boolean; key: number }>({
    error: null,
    loading: true,
    key: 0,
  });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marking a new load is intentional
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then(
      (data) => active && setState((s) => ({ data, error: null, loading: false, key: s.key + 1 })),
      (error: unknown) => {
        console.error(error);
        if (active) setState((s) => ({ ...s, error, loading: false }));
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { data: state.data, error: state.error, loading: state.loading, reload };
}
