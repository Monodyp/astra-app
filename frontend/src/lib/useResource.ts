import { useCallback, useEffect, useState } from 'react';

export type Resource<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: unknown };

export function useResource<T>(load: () => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({
    status: 'loading',
    data: null,
    error: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setResource({ status: 'loading', data: null, error: null });
    load()
      .then((data) => {
        if (active) setResource({ status: 'ready', data, error: null });
      })
      .catch((error: unknown) => {
        if (active) setResource({ status: 'error', data: null, error });
      });
    return () => {
      active = false;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback(
    (data: T) => setResource({ status: 'ready', data, error: null }),
    []
  );

  return { ...resource, reload, setData };
}
