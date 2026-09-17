import Foundation
import TealiumPrism

/// Tracks the lifecycle of native DataLayer subscriptions, keyed by the opaque
/// `subscriptionId` JS mints. The iOS mirror of the Android `SubscriptionStore`.
///
/// The SDK reports `register`/event/`onComplete` callbacks on an arbitrary
/// Tealium queue while JS `unsubscribe`/`shutdown` calls arrive on their own
/// thread, so all state is serialized on a private serial queue. Each mutation
/// computes the `Disposable` to dispose inside the critical section but calls
/// `dispose()` *outside* it, so a dispose can never re-enter the store's queue.
///
/// The registration path is async: JS asks to subscribe (`markPending`) before
/// the SDK hands back a `Disposable` (`register`). Three orderings must not leak
/// or double-dispose:
///  - unsubscribe / shutdown arriving before `register` → the entry is
///    tombstoned and the late `Disposable` is disposed the moment it registers;
///  - the SDK stream completing independently → `teardown`;
///  - normal unsubscribe after `register` → dispose once, drop the entry.
///
/// TODO: (?) Prism exposes no subscription→instance lifecycle manager, so
/// the wrapper tracks it here to guarantee dispose-on-shutdown. Keep this
/// minimal; drop it if the SDK gains an owning manager.
final class SubscriptionStore {
    private enum State {
        case pending(instanceId: String)
        case active(instanceId: String, disposable: any Disposable)
        case tombstoned
    }

    private let queue = DispatchQueue(label: "com.tealium.prism.reactnative.subscriptions")
    private var states: [String: State] = [:]
    private var byInstance: [String: Set<String>] = [:]

    /// Records intent to subscribe, before the SDK returns a `Disposable`.
    func markPending(subscriptionId: String, instanceId: String) {
        queue.sync {
            states[subscriptionId] = .pending(instanceId: instanceId)
            byInstance[instanceId, default: []].insert(subscriptionId)
        }
    }

    /// Attaches the SDK `disposable` once the subscription is live. If the entry
    /// was tombstoned meanwhile (unsubscribe/shutdown raced ahead), the
    /// `disposable` is disposed immediately and never stored.
    func register(subscriptionId: String, instanceId: String, disposable: any Disposable) {
        let tombstoned: Bool = queue.sync {
            if case .tombstoned = states[subscriptionId] {
                states.removeValue(forKey: subscriptionId)
                byInstance[instanceId]?.remove(subscriptionId)
                return true
            }
            states[subscriptionId] = .active(instanceId: instanceId, disposable: disposable)
            return false
        }
        if tombstoned {
            disposable.dispose()
        }
    }

    /// Drops a still-`pending` subscription whose instance was not found.
    func cancelPending(subscriptionId: String, instanceId: String) {
        queue.sync {
            states.removeValue(forKey: subscriptionId)
            byInstance[instanceId]?.remove(subscriptionId)
        }
    }

    /// Terminal collapse for unsubscribe / shutdown / stream completion. Active →
    /// dispose once and drop; pending → tombstone (so a later `register` disposes
    /// the late `Disposable`); tombstoned/absent → no-op.
    func teardown(subscriptionId: String) {
        let doomed: (any Disposable)? = queue.sync {
            switch states[subscriptionId] {
            case .active(let instanceId, let disposable):
                states.removeValue(forKey: subscriptionId)
                byInstance[instanceId]?.remove(subscriptionId)
                return disposable
            case .pending:
                states[subscriptionId] = .tombstoned
                return nil
            default:
                return nil
            }
        }
        doomed?.dispose()
    }

    // TODO: should we unify Tealium.shutdown behavior between 2 platforms?
    /// Disposes every subscription for `instanceId` on shutdown, so their teardown is
    /// deterministic and synchronous rather than waiting on the SDK's asynchronous
    /// shutdown `onComplete`. Mirrors Android, where the Kotlin SDK's shutdown emits no
    /// `onComplete` at all.
    func disposeAll(for instanceId: String) {
        let doomed: [any Disposable] = queue.sync {
            guard let ids = byInstance.removeValue(forKey: instanceId) else { return [] }
            var result: [any Disposable] = []
            for id in ids {
                switch states[id] {
                case .active(_, let disposable):
                    states.removeValue(forKey: id)
                    result.append(disposable)
                case .pending:
                    states[id] = .tombstoned
                default:
                    break
                }
            }
            return result
        }
        doomed.forEach { $0.dispose() }
    }

    /// Disposes every tracked subscription across all instances, for JS runtime teardown
    /// (dev reload, host recreating the React instance). Same atomicity and dispose-outside-
    /// lock pattern as [`SubscriptionStore.disposeAll(for:)`](doc:SubscriptionStore/disposeAll(for:)),
    /// widened to every instance instead of one: still-`pending` entries are tombstoned
    /// (rather than dropped) so a late `register` disposes the incoming `Disposable`.
    func disposeAll() {
        let doomed: [any Disposable] = queue.sync {
            var result: [any Disposable] = []
            for id in Array(states.keys) {
                switch states[id] {
                case .active(_, let disposable):
                    states.removeValue(forKey: id)
                    result.append(disposable)
                case .pending:
                    states[id] = .tombstoned
                default:
                    break
                }
            }
            byInstance.removeAll()
            return result
        }
        doomed.forEach { $0.dispose() }
    }
}
