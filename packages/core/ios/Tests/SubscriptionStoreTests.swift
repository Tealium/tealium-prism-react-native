import XCTest
@testable import TealiumPrismReactNative
import TealiumPrism

/// Records dispose calls so tests can assert exactly-once teardown. Conforms to
/// the SDK's `Disposable`; `dispose()` is idempotent per that contract.
private final class FakeDisposable: Disposable {
    private(set) var disposeCount = 0
    private(set) var isDisposed = false

    func dispose() {
        disposeCount += 1
        isDisposed = true
    }
}

/// Swift mirror of the Android `SubscriptionStoreTest`. Covers the same state
/// transitions: register-after-pending, exactly-once teardown, tombstone-then-
/// late-register, per-instance disposal, and unknown/no-op paths.
final class SubscriptionStoreTests: XCTestCase {

    func test_register_afterMarkPending_storesDisposableWithoutDisposing() {
        let store = SubscriptionStore()
        let disposable = FakeDisposable()

        store.markPending(subscriptionId: "s1", instanceId: "i1")
        store.register(subscriptionId: "s1", instanceId: "i1", disposable: disposable)

        XCTAssertEqual(disposable.disposeCount, 0)
        XCTAssertFalse(disposable.isDisposed)
    }

    func test_teardown_afterRegister_disposesExactlyOnce() {
        let store = SubscriptionStore()
        let disposable = FakeDisposable()
        store.markPending(subscriptionId: "s1", instanceId: "i1")
        store.register(subscriptionId: "s1", instanceId: "i1", disposable: disposable)

        store.teardown(subscriptionId: "s1")
        store.teardown(subscriptionId: "s1")

        XCTAssertEqual(disposable.disposeCount, 1)
        XCTAssertTrue(disposable.isDisposed)
    }

    func test_teardown_beforeRegister_disposesLateDisposableExactlyOnce() {
        let store = SubscriptionStore()
        let disposable = FakeDisposable()
        store.markPending(subscriptionId: "s1", instanceId: "i1")

        // Unsubscribe arrives before the SDK returns the disposable: the entry is
        // tombstoned, then the late register disposes it immediately.
        store.teardown(subscriptionId: "s1")
        store.register(subscriptionId: "s1", instanceId: "i1", disposable: disposable)

        XCTAssertEqual(disposable.disposeCount, 1)
        XCTAssertTrue(disposable.isDisposed)
    }

    func test_disposeAll_beforeRegister_disposesLateDisposable() {
        let store = SubscriptionStore()
        let disposable = FakeDisposable()
        store.markPending(subscriptionId: "s1", instanceId: "i1")

        // Shutdown arrives before register: tombstone, then dispose on register.
        store.disposeAll(for: "i1")
        store.register(subscriptionId: "s1", instanceId: "i1", disposable: disposable)

        XCTAssertEqual(disposable.disposeCount, 1)
        XCTAssertTrue(disposable.isDisposed)
    }

    func test_cancelPending_thenTeardown_isNoOp() {
        let store = SubscriptionStore()
        let disposable = FakeDisposable()
        // Instance not found: the pending entry is dropped. teardown must then not
        // tombstone the dropped id, so a fresh register for it stays active instead
        // of being disposed.
        store.markPending(subscriptionId: "s1", instanceId: "i1")
        store.cancelPending(subscriptionId: "s1", instanceId: "i1")
        store.teardown(subscriptionId: "s1")
        store.register(subscriptionId: "s1", instanceId: "i1", disposable: disposable)

        XCTAssertEqual(disposable.disposeCount, 0)
        XCTAssertFalse(disposable.isDisposed)
    }

    func test_disposeAll_disposesOnlyThatInstance() {
        let store = SubscriptionStore()
        let disposableA = FakeDisposable()
        let disposableB = FakeDisposable()
        store.markPending(subscriptionId: "sA", instanceId: "iA")
        store.register(subscriptionId: "sA", instanceId: "iA", disposable: disposableA)
        store.markPending(subscriptionId: "sB", instanceId: "iB")
        store.register(subscriptionId: "sB", instanceId: "iB", disposable: disposableB)

        store.disposeAll(for: "iA")

        XCTAssertEqual(disposableA.disposeCount, 1)
        XCTAssertEqual(disposableB.disposeCount, 0)
    }

    func test_disposeAll_disposesEveryActiveSubscriptionOnce() {
        let store = SubscriptionStore()
        let disposable1 = FakeDisposable()
        let disposable2 = FakeDisposable()
        store.markPending(subscriptionId: "s1", instanceId: "i1")
        store.register(subscriptionId: "s1", instanceId: "i1", disposable: disposable1)
        store.markPending(subscriptionId: "s2", instanceId: "i1")
        store.register(subscriptionId: "s2", instanceId: "i1", disposable: disposable2)

        store.disposeAll(for: "i1")
        store.disposeAll(for: "i1") // second call must be a no-op

        XCTAssertEqual(disposable1.disposeCount, 1)
        XCTAssertEqual(disposable2.disposeCount, 1)
    }

    func test_teardown_unknownSubscription_isNoOp() {
        let store = SubscriptionStore()
        let disposable = FakeDisposable()

        // teardown of an id never seen must not create a tombstone: a later
        // register for that id stays active instead of being disposed.
        store.teardown(subscriptionId: "never-registered")
        store.register(subscriptionId: "never-registered", instanceId: "i1", disposable: disposable)

        XCTAssertEqual(disposable.disposeCount, 0)
        XCTAssertFalse(disposable.isDisposed)
    }
}
