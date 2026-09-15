import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type Disposable,
  type JsonValueObject,
} from "@tealium/prism-react-native";
import { useTealium } from "./TealiumProvider";

type DataLayerSubscriptionContextValue = {
  /** `true` while an `onDataUpdated` subscription is active for the active instance. */
  subscribed: boolean;
  /** Deltas received so far for the active instance, newest first. Keeps accumulating while the DataLayer screen is unmounted and while another instance is active. */
  updates: JsonValueObject[];
  /** Last subscribe error for the active instance, or null. Cleared on a new attempt. */
  error: string | null;
  /** Opens an `onDataUpdated` subscription on the active instance, unless one is already open. */
  subscribe: () => void;
  /** Disposes the active instance's subscription, if any. */
  unsubscribe: () => void;
};

const DataLayerSubscriptionContext =
  createContext<DataLayerSubscriptionContextValue | null>(null);

// Stable empty array for instances with no updates yet, so the memoized context
// value doesn't churn on every render for an unsubscribed instance.
const EMPTY_UPDATES: JsonValueObject[] = [];

/** Returns `prev` unchanged unless some id is gone, else a copy without dead ids. */
function pruneSet(prev: Set<string>, liveIds: Set<string>): Set<string> {
  let changed = false;
  const next = new Set<string>();
  prev.forEach((id) => {
    if (liveIds.has(id)) {
      next.add(id);
    } else {
      changed = true;
    }
  });
  return changed ? next : prev;
}

/** Returns `prev` unchanged unless some key is gone, else a copy without dead keys. */
function pruneRecord<T>(
  prev: Record<string, T>,
  liveIds: Set<string>,
): Record<string, T> {
  let changed = false;
  const next: Record<string, T> = {};
  for (const id of Object.keys(prev)) {
    if (liveIds.has(id)) {
      next[id] = prev[id];
    } else {
      changed = true;
    }
  }
  return changed ? next : prev;
}

/**
 * Holds DataLayer `onDataUpdated` subscriptions above the screen tree, one per
 * Tealium instance, so they survive both leaving/returning to the DataLayer
 * screen and switching the active instance. The screen is unmounted on Back
 * (App.tsx swaps screens by conditional render) and its slice of state is keyed
 * by the active instance, so a subscription owned by the screen — or keyed only
 * on the active instance — would be lost on navigation or on any instance
 * switch. Owning a per-instance registry here keeps each instance's subscription
 * and accumulated updates alive until that instance is shut down or the user
 * explicitly unsubscribes it.
 *
 * The "a subscription never outlives its instance" invariant is preserved by
 * disposing an instance's subscription as soon as it disappears from the
 * TealiumProvider registry (shutdown), rather than when it merely stops being
 * the active instance.
 */
export function DataLayerSubscriptionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { activeInstance, instances } = useTealium();
  const activeId = activeInstance?.instanceId ?? null;

  // Per-instance native subscription handles. Kept in a ref (not renderable
  // state); render-visible facts live in the state maps below, keyed by the
  // same instance id.
  const subscriptions = useRef<Map<string, Disposable>>(new Map());
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [updatesByInstance, setUpdatesByInstance] = useState<
    Record<string, JsonValueObject[]>
  >({});
  const [errorByInstance, setErrorByInstance] = useState<
    Record<string, string | null>
  >({});

  // When an instance is shut down it leaves the registry; dispose its
  // subscription and drop its state so a subscription never outlives its
  // instance. Keyed on `instances` (identity changes only on create/shutdown),
  // so merely switching the active instance never disposes anything.
  useEffect(() => {
    const liveIds = new Set(instances.map((i) => i.key));
    subscriptions.current.forEach((sub, id) => {
      if (!liveIds.has(id)) {
        sub.dispose();
        subscriptions.current.delete(id);
      }
    });
    setSubscribedIds((prev) => pruneSet(prev, liveIds));
    setUpdatesByInstance((prev) => pruneRecord(prev, liveIds));
    setErrorByInstance((prev) => pruneRecord(prev, liveIds));
  }, [instances]);

  // Dispose everything if the provider itself is torn down (app teardown).
  useEffect(() => {
    const registry = subscriptions.current;
    return () => {
      registry.forEach((sub) => sub.dispose());
      registry.clear();
    };
  }, []);

  const subscribe = useCallback(() => {
    if (!activeInstance) {
      return;
    }
    const id = activeInstance.instanceId;
    setErrorByInstance((prev) => ({ ...prev, [id]: null }));
    if (subscriptions.current.has(id)) {
      return;
    }
    try {
      const sub = activeInstance.dataLayer.onDataUpdated((data) => {
        setUpdatesByInstance((prev) => ({
          ...prev,
          [id]: [data, ...(prev[id] ?? [])],
        }));
      });
      subscriptions.current.set(id, sub);
      setSubscribedIds((prev) => new Set(prev).add(id));
    } catch (e) {
      setErrorByInstance((prev) => ({ ...prev, [id]: String(e) }));
    }
  }, [activeInstance]);

  const unsubscribe = useCallback(() => {
    if (!activeInstance) {
      return;
    }
    const id = activeInstance.instanceId;
    subscriptions.current.get(id)?.dispose();
    subscriptions.current.delete(id);
    setSubscribedIds((prev) => {
      if (!prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [activeInstance]);

  const subscribed = activeId != null && subscribedIds.has(activeId);
  const updates =
    (activeId != null ? updatesByInstance[activeId] : undefined) ??
    EMPTY_UPDATES;
  const error = activeId != null ? (errorByInstance[activeId] ?? null) : null;

  const value = useMemo(
    () => ({ subscribed, updates, error, subscribe, unsubscribe }),
    [subscribed, updates, error, subscribe, unsubscribe],
  );

  return (
    <DataLayerSubscriptionContext.Provider value={value}>
      {children}
    </DataLayerSubscriptionContext.Provider>
  );
}

/** Returns the active instance's DataLayer subscription state and controls. */
export function useDataLayerSubscription(): DataLayerSubscriptionContextValue {
  const value = useContext(DataLayerSubscriptionContext);
  if (!value) {
    throw new Error(
      "useDataLayerSubscription must be used within a DataLayerSubscriptionProvider",
    );
  }
  return value;
}
