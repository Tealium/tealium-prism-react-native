package com.tealium.prism.reactnative.data

import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.tealium.prism.core.api.data.DataItem
import com.tealium.prism.core.api.data.DataList
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.data.UnsupportedDataItemException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Round-trip and type-fidelity tests for the Android bridge converters.
 *
 * Pure JVM: `JavaOnlyMap`/`JavaOnlyArray` are plain in-memory implementations of
 * the bridge interfaces, so no device or Robolectric is required. The outbound
 * converters are given `JavaOnly*` factories instead of the JNI-backed
 * `Arguments.create*()`.
 */
class RNDataConversionTest {

  private val mapFactory: () -> WritableMap = { JavaOnlyMap() }
  private val arrayFactory: () -> WritableArray = { JavaOnlyArray() }

  private fun DataObject.toJsMap(): ReadableMap = toWritableMap(mapFactory, arrayFactory)

  private fun DataList.toJsArray(): ReadableArray = toWritableArray(mapFactory, arrayFactory)

  // region Inbound: ReadableMap -> DataObject

  @Test
  fun inbound_primitives_convertToDataItems() {
    val input = JavaOnlyMap().apply {
      putString("s", "hi")
      putBoolean("b", true)
      putDouble("n", 7.0)
      putDouble("f", 1.5)
      putNull("x")
    }

    val obj = input.toDataObject()

    assertEquals("hi", obj.getString("s"))
    assertEquals(true, obj.get("b")?.getBoolean())
    // toHashMap() boxes every JS number as Double; convert() keeps Double.
    assertTrue(obj.get("n")!!.isDouble())
    assertEquals(7.0, obj.get("n")!!.getDouble()!!, 0.0)
    assertEquals(1.5, obj.get("f")!!.getDouble()!!, 0.0)
    assertTrue(obj.get("x")!!.isNull())
  }

  @Test
  fun inbound_wholeNumber_staysDouble() {
    val input = JavaOnlyMap().apply { putDouble("whole", 42.0) }

    val obj = input.toDataObject()

    // Android asymmetry vs iOS: a whole JS number stays Double internally.
    assertTrue(obj.get("whole")!!.isDouble())
    assertFalse(obj.get("whole")!!.isInt())
  }

  @Test
  fun inbound_nestedObjectAndArray() {
    // Production ReadableNativeMap.toHashMap() deep-converts nested containers
    // to plain Map/List before fromMap() sees them. JavaOnlyMap.of() stores
    // non-Number values verbatim, so nested plain Map/List survive its shallow
    // toHashMap() — reproducing the production end state.
    val input = JavaOnlyMap.of(
      "user", mapOf("name" to "Ann", "age" to 30.0),
      "tags", listOf("a", 2.0, false, null, mapOf("k" to "v")),
    )

    val obj = input.toDataObject()

    val user = obj.get("user")!!.getDataObject()!!
    assertEquals("Ann", user.getString("name"))
    val list = obj.get("tags")!!.getDataList()!!
    assertEquals(5, list.size)
    assertTrue(list.get(3)!!.isNull())
    assertEquals("v", list.get(4)!!.getDataObject()!!.getString("k"))
  }

  @Test
  fun inbound_emptyContainers() {
    val input = JavaOnlyMap.of(
      "obj", emptyMap<String, Any?>(),
      "arr", emptyList<Any?>(),
    )

    val obj = input.toDataObject()

    assertEquals(0, obj.get("obj")!!.getDataObject()!!.size)
    assertEquals(0, obj.get("arr")!!.getDataList()!!.size)
  }

  @Test
  fun inbound_array_toDataList() {
    val input = JavaOnlyArray().apply {
      pushString("a")
      pushDouble(1.0)
      pushNull()
    }

    val list = input.toDataList()

    assertEquals(3, list.size)
    assertEquals("a", list.get(0)!!.getString())
    assertTrue(list.get(2)!!.isNull())
  }

  // endregion

  // region Outbound: DataObject -> WritableMap

  @Test
  fun outbound_primitives_preserveTypeAndValue() {
    val obj = DataObject.Builder()
      .put("s", "hi")
      .put("b", true)
      .put("i", 7)
      .put("d", 1.5)
      .putNull("x")
      .build()

    val map = obj.toJsMap()

    assertEquals(ReadableType.String, map.getType("s"))
    assertEquals("hi", map.getString("s"))
    assertEquals(ReadableType.Boolean, map.getType("b"))
    assertTrue(map.getBoolean("b"))
    assertEquals(ReadableType.Number, map.getType("i"))
    assertEquals(7, map.getInt("i"))
    assertEquals(1.5, map.getDouble("d"), 0.0)
    assertEquals(ReadableType.Null, map.getType("x"))
    assertTrue(map.isNull("x"))
  }

  @Test
  fun outbound_boolNotCoercedToNumber() {
    val obj = DataObject.Builder().put("b", true).build()

    val map = obj.toJsMap()

    assertEquals(ReadableType.Boolean, map.getType("b"))
    assertTrue(map.getBoolean("b"))
  }

  @Test
  fun outbound_intStaysInt_notWidenedToDouble() {
    // A DataItem holding an Int must surface as an Int, not be collapsed to
    // Double by getDouble() coercion.
    val obj = DataObject.Builder().put("i", 42).build()

    val map = obj.toJsMap()

    assertEquals(42, map.getInt("i"))
  }

  @Test
  fun outbound_longBoundary_viaDouble() {
    val obj = DataObject.Builder().put("big", Long.MAX_VALUE).build()

    val map = obj.toJsMap()

    // Long is written via putDouble (JS number is IEEE-754 double).
    assertEquals(Long.MAX_VALUE.toDouble(), map.getDouble("big"), 0.0)
  }

  @Test
  fun outbound_nestedObjectAndArray() {
    val obj = DataObject.create {
      put("user", DataObject.Builder().put("name", "Ann").put("age", 30).build())
      put(
        "tags",
        DataList.create {
          add("a")
          add(2)
          add(false)
          addNull()
          add(DataObject.Builder().put("k", "v").build())
        }
      )
    }

    val map = obj.toJsMap()

    val user = map.getMap("user")!!
    assertEquals("Ann", user.getString("name"))
    val tags = map.getArray("tags")!!
    assertEquals(5, tags.size())
    assertEquals(ReadableType.String, tags.getType(0))
    assertEquals(ReadableType.Number, tags.getType(1))
    assertEquals(ReadableType.Boolean, tags.getType(2))
    assertEquals(ReadableType.Null, tags.getType(3))
    assertEquals("v", tags.getMap(4)!!.getString("k"))
  }

  @Test
  fun outbound_nullPreservedAtEveryLevel() {
    val obj = DataObject.create {
      putNull("root")
      put("arr", DataList.create { addNull() })
      put("nested", DataObject.Builder().putNull("inner").build())
    }

    val map = obj.toJsMap()

    assertTrue(map.isNull("root"))
    assertEquals(ReadableType.Null, map.getArray("arr")!!.getType(0))
    assertTrue(map.getMap("nested")!!.isNull("inner"))
  }

  @Test
  fun outbound_emptyContainers() {
    val obj = DataObject.create {
      put("obj", DataObject.EMPTY_OBJECT)
      put("arr", DataList.EMPTY_LIST)
    }

    val map = obj.toJsMap()

    assertEquals(0, map.getMap("obj")!!.toHashMap().size)
    assertEquals(0, map.getArray("arr")!!.size())
  }

  @Test
  fun outbound_unicodeString() {
    val obj = DataObject.Builder().put("emoji", "héllo 🌍").build()

    val map = obj.toJsMap()

    assertEquals("héllo 🌍", map.getString("emoji"))
  }

  // endregion

  // region Round-trip & edge cases

  @Test
  fun roundTrip_deeplyNested_preservesJsValues() {
    val input = JavaOnlyMap.of(
      "l1", mapOf(
        "l2" to mapOf(
          "l3" to listOf(mapOf("leaf" to "deep"))
        )
      )
    )

    val out = input.toDataObject().toJsMap()

    val leaf = out
      .getMap("l1")!!
      .getMap("l2")!!
      .getArray("l3")!!
      .getMap(0)!!
      .getString("leaf")
    assertEquals("deep", leaf)
  }

  @Test
  fun roundTrip_wholeNumber_returnsSameJsValue() {
    val input = JavaOnlyMap().apply { putDouble("whole", 42.0) }

    val out = input.toDataObject().toJsMap()

    // JS-observable value is 42 on both platforms, regardless of internal type.
    assertEquals(42.0, out.getDouble("whole"), 0.0)
  }

  @Test(expected = UnsupportedDataItemException::class)
  fun inbound_nonStringKey_throws() {
    // DataObject.fromMap throws when a key is not a String.
    DataObject.fromMap(mapOf(1 to "value"))
  }

  // endregion
}
