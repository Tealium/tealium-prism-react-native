import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Tealium } from "@tealium/prism-react-native";

type TealiumContextValue = {
  /** The shared instance, or null if creation failed. */
  instance: Tealium | null;
  /** Set if the shared instance could not be created. */
  error: string | null;
};

const TealiumContext = createContext<TealiumContextValue | null>(null);

/**
 * Provides a single shared Tealium instance to the app. Most screens should
 * consume this via {@link useTealium} rather than creating their own instance,
 * which mirrors how apps are expected to use the SDK: one instance for the
 * whole app. InstancesScreen deliberately manages its own instances to demo
 * the create/shutdown lifecycle.
 *
 * The instance is created eagerly on mount. The SDK singletons per
 * account-profile, so creating it here is cheap and safe.
 */
export function TealiumProvider({ children }: { children: ReactNode }) {
  // useState initializer runs the creation once, on mount.
  const [{ instance, error }] = useState<TealiumContextValue>(() => {
    try {
      return {
        instance: Tealium.create("tealiummobile", "demo", "dev"),
        error: null,
      };
    } catch (e) {
      return { instance: null, error: String(e) };
    }
  });

  const value = useMemo(() => ({ instance, error }), [instance, error]);

  return (
    <TealiumContext.Provider value={value}>{children}</TealiumContext.Provider>
  );
}

/** Returns the shared Tealium instance and any creation error. */
export function useTealium(): TealiumContextValue {
  const value = useContext(TealiumContext);
  if (!value) {
    throw new Error("useTealium must be used within a TealiumProvider");
  }
  return value;
}
