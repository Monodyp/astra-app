import { useEffect, useRef, useState } from 'react';
import { portalData, type DigitalId } from '../../data/index.js';

export function useDigitalId(memberId: string | undefined) {
  const [record, setRecord] = useState<{
    owner: string | undefined;
    id: DigitalId;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [, tick] = useState(0);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let pending = false;
    let renewal: number | undefined;
    let expiry: number | undefined;
    setRecord(null);
    setError(null);

    const refresh = async () => {
      if (!active || pending) return;
      pending = true;
      setRefreshing(true);
      window.clearTimeout(renewal);
      try {
        const id = await portalData.getDigitalId();
        if (!active) return;
        setRecord({ owner: memberId, id });
        setError(null);
        window.clearTimeout(expiry);
        const remaining = Date.parse(id.qrExpiresAt ?? '') - Date.now();
        if (id.membershipStatus === 'verified' && id.qrValue && remaining > 0) {
          expiry = window.setTimeout(
            () => tick((value) => value + 1),
            remaining
          );
          renewal = window.setTimeout(
            () => void refresh(),
            Math.max(1000, remaining - Math.min(30_000, remaining / 2))
          );
        }
      } catch (caught) {
        if (active) setError(caught);
        // One automatic attempt per issued credential; manual/focus retries remain available.
      } finally {
        pending = false;
        if (active) setRefreshing(false);
      }
    };
    refreshRef.current = () => void refresh();
    const resume = () => {
      if (document.visibilityState !== 'hidden') void refresh();
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    void refresh();
    return () => {
      active = false;
      window.clearTimeout(renewal);
      window.clearTimeout(expiry);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [memberId]);

  const data = record?.owner === memberId ? (record?.id ?? null) : null;
  const qrReady =
    !!data &&
    data.membershipStatus === 'verified' &&
    !!data.qrValue &&
    Date.parse(data.qrExpiresAt ?? '') > Date.now();
  return {
    data,
    error,
    refreshing,
    qrReady,
    reload: () => refreshRef.current(),
  };
}
