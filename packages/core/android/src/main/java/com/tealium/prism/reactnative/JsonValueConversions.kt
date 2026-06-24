package com.tealium.prism.reactnative

import com.tealium.prism.core.api.data.DataItem

internal fun jsonValueRoundTrip(jsonString: String): String =
  DataItem.parse(jsonString).toString()
