import Foundation
import TealiumPrism

final class TealiumPrismInstanceRegistry {
    static let shared = TealiumPrismInstanceRegistry()

    private var instances: [String: InstanceEntry] = [:]

    private struct InstanceEntry {
        let tealium: Tealium
        let disposables: CompositeDisposable
    }

    private init() {}

    func create(
        account: String,
        profile: String,
        environment: String,
        logLevel: String?
    ) -> String {
        let key = "\(account)-\(profile)"

        if instances[key] != nil {
            return key
        }

        let forcingSettingsBlock: ((CoreSettingsBuilder) -> CoreSettingsBuilder)? = logLevel.flatMap { level in
            LogLevel.Minimum(from: level).map { minLevel in
                { builder in builder.setMinLogLevel(minLevel) }
            }
        }

        let config = TealiumConfig(
            account: account,
            profile: profile,
            environment: environment,
            forcingSettings: forcingSettingsBlock
        )

        let instance = Tealium.create(config: config)
        let disposables = Disposables.composite(for: instance)
        instances[key] = InstanceEntry(tealium: instance, disposables: disposables)

        return key
    }

    func get(_ key: String) -> Tealium? {
        instances[key]?.tealium
    }

    func getDisposables(_ key: String) -> CompositeDisposable? {
        instances[key]?.disposables
    }

    func remove(_ key: String) {
        guard let entry = instances.removeValue(forKey: key) else {
            return
        }
        entry.disposables.dispose()
    }
}
