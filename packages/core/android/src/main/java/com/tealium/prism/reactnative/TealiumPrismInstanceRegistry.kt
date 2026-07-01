package com.tealium.prism.reactnative

import android.app.Application
import com.tealium.prism.core.api.Tealium
import com.tealium.prism.core.api.TealiumConfig
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.logger.LogLevel
import com.tealium.prism.core.api.pubsub.CompositeDisposable
import com.tealium.prism.core.api.pubsub.Disposables

internal object TealiumPrismInstanceRegistry {
    private val instances = mutableMapOf<String, InstanceEntry>()

    private data class InstanceEntry(
        val tealium: Tealium,
        val disposables: CompositeDisposable
    )

    fun create(
        application: Application,
        account: String,
        profile: String,
        environment: String,
        logLevel: String?
    ): String {
        val key = "$account-$profile"
        if (instances.containsKey(key)) return key

        val configBuilder = TealiumConfig.Builder(
            application = application,
            accountName = account,
            profileName = profile,
            environment = environment,
            modules = emptyList()
        )

        // TODO: add a conditional check like on Swift when converter will return null for invalid log level string
        logLevel?.let { level ->
            val parsedLevel = LogLevel.Converter.convert(DataItem.string(level))
            configBuilder.configureCoreSettings { settings ->
                settings.setLogLevel(parsedLevel)
            }
        }

        val config = configBuilder.build()
        val instance = Tealium.create(config)
        val disposables = Disposables.composite()
        instances[key] = InstanceEntry(instance, disposables)
        return key
    }

    fun get(key: String): Tealium? = instances[key]?.tealium

    fun getDisposables(key: String): CompositeDisposable? = instances[key]?.disposables

    fun remove(key: String) {
        val entry = instances.remove(key)
        entry?.disposables?.dispose()
        entry?.tealium?.shutdown()
    }
}
