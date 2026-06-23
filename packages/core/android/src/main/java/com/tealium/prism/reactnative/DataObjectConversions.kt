package com.tealium.prism.reactnative

import com.tealium.prism.core.api.data.DataObject
import org.json.JSONObject

internal fun dataObjectFromJsonString(jsonString: String): DataObject =
  DataObject.fromJSONObject(JSONObject(jsonString))

internal fun DataObject.toJsonString(): String = this.toString()
