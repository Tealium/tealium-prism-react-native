package com.tealium.prism.reactnative

import com.facebook.react.bridge.JavaOnlyArray
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.persistence.Expiry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Unit tests for the pure DataLayer bridge conversions. Robolectric provides the Android
 * `org.json` implementation that Prism's [DataObject]/`DataItem` parsing relies on.
 *
 * The SDK level is pinned because this module's `targetSdkVersion` (36) is newer than the highest
 * level Robolectric 4.13 ships images for; the conversions under test are SDK-level independent.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DataLayerConversionsTest {

    @Test
    fun test_resolveExpiry_with_null_returns_null() {
        assertNull(resolveExpiry(null))
    }

    @Test
    fun test_resolveExpiry_with_forever_sentinel_resolves_to_forever() {
        assertEquals(Expiry.FOREVER, resolveExpiry(-1.0))
    }

    @Test
    fun test_resolveExpiry_with_session_sentinel_resolves_to_session() {
        assertEquals(Expiry.SESSION, resolveExpiry(-2.0))
    }

    @Test
    fun test_resolveExpiry_with_until_restart_sentinel_resolves_to_until_restart() {
        assertEquals(Expiry.UNTIL_RESTART, resolveExpiry(-3.0))
    }

    @Test
    fun test_resolveExpiry_with_duration_resolves_to_expiry_that_many_seconds_from_now() {
        val expiry = requireNotNull(resolveExpiry(90.0)) { "90 should resolve to an expiry" }
        val expectedExpiryTime = System.currentTimeMillis() / 1000 + 90

        val expiryTime = expiry.expiryTime()
        assertTrue(
            "expiryTime $expiryTime should be within 2s of $expectedExpiryTime",
            Math.abs(expiryTime - expectedExpiryTime) <= 2
        )
    }

    @Test
    fun test_resolveExpiry_with_fractional_seconds_resolves_to_expiry_about_one_second_from_now() {
        val expiry = requireNotNull(resolveExpiry(1.5)) { "1.5 should resolve to an expiry" }
        val expectedExpiryTime = System.currentTimeMillis() / 1000 + 1

        val expiryTime = expiry.expiryTime()
        assertTrue(
            "expiryTime $expiryTime should be within 2s of $expectedExpiryTime",
            Math.abs(expiryTime - expectedExpiryTime) <= 2
        )
    }

    @Test
    fun test_resolveExpiry_with_unknown_negative_sentinel_returns_null() {
        assertNull(resolveExpiry(-99.0))
    }

    @Test
    fun test_stringList_with_array_of_strings_returns_keys_in_order() {
        assertEquals(listOf("alpha", "beta"), stringList(JavaOnlyArray.of("alpha", "beta")))
    }

    @Test
    fun test_stringList_with_empty_array_returns_empty_list() {
        assertEquals(emptyList<String>(), stringList(JavaOnlyArray()))
    }

    @Test
    fun test_stringList_with_non_string_element_returns_null() {
        assertNull(stringList(JavaOnlyArray.of("alpha", 42.0)))
    }

    @Test
    fun test_stringList_with_null_element_returns_null() {
        assertNull(stringList(JavaOnlyArray.of("alpha", null)))
    }

    @Test
    fun test_dataObject_json_round_trip_preserves_nested_values() {
        val json = """
            {"string":"value","int":42,"double":1.5,"boolean":true,"nothing":null,
            "nested":{"inner":"deep","innerNumber":7},"list":[1,"two",false]}
        """.trimIndent()

        val data = requireNotNull(DataObject.fromString(json)) { "fixture should parse" }
        val roundTripped = requireNotNull(DataObject.fromString(jsonString(data.asDataItem()))) {
            "round-tripped JSON should parse"
        }

        assertEquals(data, roundTripped)
        assertEquals("value", roundTripped.getString("string"))
        assertEquals(42, roundTripped.getInt("int"))
        assertEquals(1.5, requireNotNull(roundTripped.getDouble("double")), 0.0)
        assertEquals(true, roundTripped.getBoolean("boolean"))
        assertTrue(requireNotNull(roundTripped.get("nothing")) { "key should be present" }.isNull())

        val nested = requireNotNull(roundTripped.getDataObject("nested")) { "nested object" }
        assertEquals("deep", nested.getString("inner"))
        assertEquals(7, nested.getInt("innerNumber"))

        val list = requireNotNull(roundTripped.getDataList("list")) { "nested list" }
        assertEquals(3, list.size)
        assertEquals(1, list.getInt(0))
        assertEquals("two", list.getString(1))
        assertEquals(false, list.getBoolean(2))
    }
}
