package com.tealium.prism.reactnative

import com.facebook.react.bridge.JavaOnlyArray
import com.tealium.prism.core.api.data.DataObject
import com.tealium.prism.core.api.persistence.Expiry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
    fun test_resolveExpiry_with_millisecond_timestamp_resolves_to_that_epoch_second() {
        val expiry = requireNotNull(resolveExpiry(1_700_000_000_000.0)) {
            "a millisecond timestamp should resolve to an expiry"
        }
        assertEquals(1_700_000_000L, expiry.expiryTime())
    }

    @Test
    fun test_resolveExpiry_with_sub_second_timestamp_truncates_to_the_epoch_second() {
        val expiry = requireNotNull(resolveExpiry(1_700_000_000_999.0)) {
            "a millisecond timestamp should resolve to an expiry"
        }
        assertEquals(1_700_000_000L, expiry.expiryTime())
    }

    @Test
    fun test_resolveExpiry_with_zero_resolves_to_unix_epoch() {
        val expiry = requireNotNull(resolveExpiry(0.0)) {
            "0 should resolve to an expiry"
        }
        assertEquals(0L, expiry.expiryTime())
    }

    @Test
    fun test_resolveExpiry_with_future_timestamp_is_not_expired() {
        val inOneHour = System.currentTimeMillis() + 3_600_000
        val expiry = requireNotNull(resolveExpiry(inOneHour.toDouble())) {
            "a future timestamp should resolve to an expiry"
        }
        assertFalse(Expiry.isExpired(expiry))
    }

    @Test
    fun test_resolveExpiry_with_past_timestamp_is_expired() {
        val oneHourAgo = System.currentTimeMillis() - 3_600_000
        val expiry = requireNotNull(resolveExpiry(oneHourAgo.toDouble())) {
            "a past timestamp should resolve to an expiry"
        }
        assertTrue(Expiry.isExpired(expiry))
    }

    @Test
    fun test_resolveExpiry_with_unknown_negative_value_resolves_to_past_timestamp() {
        // -99 is not one of the -1/-2/-3 sentinels, so it is treated as a millisecond timestamp;
        // -99 / 1000 truncates to epoch second 0, i.e. a pre-1970 (already expired) instant.
        val expiry = requireNotNull(resolveExpiry(-99.0)) {
            "an unknown negative value should resolve to an expiry, not a sentinel"
        }
        assertEquals(0L, expiry.expiryTime())
        assertTrue(Expiry.isExpired(expiry))
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
