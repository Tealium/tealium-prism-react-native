import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Tealium, type LogLevel } from "@tealium/prism-react-native";

type InstanceInfo = {
  key: string;
  instance: Tealium;
};

type TealiumContextValue = {
  /** All instances created via the provider, keyed by instance id. */
  instances: InstanceInfo[];
  /** The key of the active instance, or null if none is active. */
  activeKey: string | null;
  /** The active instance, or null if none is active. */
  activeInstance: Tealium | null;
  /**
   * Creates (or reuses) an instance, adds it to the registry, and makes it
   * active. Synchronous like {@link Tealium.create} — throws on failure so the
   * caller can surface it.
   */
  createInstance: (
    account: string,
    profile: string,
    environment: string,
    logLevel?: LogLevel,
  ) => void;
  /**
   * Shuts down and removes the instance; clears {@link activeKey} app-wide if it
   * was the active one. Returns the shutdown Promise so callers can catch
   * failures.
   */
  shutdownInstance: (key: string) => Promise<void>;
  /** Selects the active instance, or clears the selection with null. */
  setActiveKey: (key: string | null) => void;
};

const TealiumContext = createContext<TealiumContextValue | null>(null);

/**
 * Owns the app's Tealium instance registry and the active-instance selection,
 * acting as the single source of truth consumed by every screen. InstancesScreen
 * is the only place that creates, shuts down, or selects instances; other screens
 * (e.g. TraceScreen) consume {@link TealiumContextValue.activeInstance} and react
 * when it changes or goes away. This mirrors how apps are expected to use the
 * SDK: hold one instance and pass it around, rather than creating a new one per
 * screen.
 *
 * Nothing is created eagerly — the registry starts empty and fills as the user
 * creates instances on the Instances screen.
 */
export function TealiumProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const createInstance = useCallback(
    (
      account: string,
      profile: string,
      environment: string,
      logLevel?: LogLevel,
    ) => {
      // May throw — Tealium.create is synchronous; let the caller surface it.
      const instance = Tealium.create(account, profile, environment, logLevel);
      const key = instance.instanceId;

      setInstances((prev) =>
        prev.some((i) => i.key === key) ? prev : [...prev, { key, instance }],
      );
      setActiveKey(key);
    },
    [],
  );

  const shutdownInstance = useCallback(
    (key: string) => {
      const info = instances.find((i) => i.key === key);
      if (!info) {
        return Promise.resolve();
      }
      // shutdown() kills the instance synchronously, so drop it from state up
      // front (even if native shutdown rejects) instead of in a .then.
      setInstances((prev) => prev.filter((i) => i.key !== key));
      setActiveKey((prev) => (prev === key ? null : prev));
      return info.instance.shutdown();
    },
    [instances],
  );

  const activeInstance = useMemo(
    () => instances.find((i) => i.key === activeKey)?.instance ?? null,
    [instances, activeKey],
  );

  const value = useMemo(
    () => ({
      instances,
      activeKey,
      activeInstance,
      createInstance,
      shutdownInstance,
      setActiveKey,
    }),
    [instances, activeKey, activeInstance, createInstance, shutdownInstance],
  );

  return (
    <TealiumContext.Provider value={value}>{children}</TealiumContext.Provider>
  );
}

/** Returns the shared Tealium registry and active-instance controls. */
export function useTealium(): TealiumContextValue {
  const value = useContext(TealiumContext);
  if (!value) {
    throw new Error("useTealium must be used within a TealiumProvider");
  }
  return value;
}
