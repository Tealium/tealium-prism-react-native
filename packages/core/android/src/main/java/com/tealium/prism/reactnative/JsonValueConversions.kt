package com.tealium.prism.reactnative

import com.tealium.prism.core.api.data.DataItem

internal fun dataItem(jsonString: String): DataItem =
    DataItem.parse(jsonString)

internal fun jsonString(dataItem: DataItem): String =
    dataItem.toString()
