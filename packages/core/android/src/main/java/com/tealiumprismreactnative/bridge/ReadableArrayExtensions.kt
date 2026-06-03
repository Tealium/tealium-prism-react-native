package com.tealiumprismreactnative.bridge

import com.facebook.react.bridge.ReadableArray

internal fun ReadableArray.toStringList(): List<String> {
    val list = mutableListOf<String>()
    for (i in 0 until size()) getString(i)?.let { list.add(it) }
    return list
}

internal fun ReadableArray.toStringSet(): Set<String> {
    val set = mutableSetOf<String>()
    for (i in 0 until size()) getString(i)?.let { set.add(it) }
    return set
}
