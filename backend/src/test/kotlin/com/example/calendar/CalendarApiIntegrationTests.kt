package com.example.calendar

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

@SpringBootTest
@AutoConfigureMockMvc
class CalendarApiIntegrationTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Test
    fun `lists seeded booking types`() {
        mockMvc.get("/booking-types")
            .andExpect {
                status { isOk() }
                jsonPath("$", hasSize<Any>(2))
                jsonPath("$[0].id") { value("intro-call") }
                jsonPath("$[1].id") { value("product-review") }
            }
    }

    @Test
    fun `creates booking for available slot and rejects duplicate start time`() {
        val availability = mockMvc.get("/booking-types/intro-call/availability")
            .andExpect {
                status { isOk() }
                jsonPath("$.slots") { isArray() }
            }
            .andReturn()
            .response
            .contentAsString
            .asJson()

        val startsAt = availability["slots"].first()["startsAt"].asText()
        val payload = """
            {
              "eventTypeId": "intro-call",
              "startsAt": "$startsAt",
              "guest": {
                "name": "Elena Smirnova",
                "email": "elena@example.com"
              }
            }
        """.trimIndent()

        mockMvc.post("/bookings") {
            contentType = MediaType.APPLICATION_JSON
            content = payload
        }.andExpect {
            status { isCreated() }
            jsonPath("$.eventTypeId") { value("intro-call") }
            jsonPath("$.startsAt") { value(startsAt) }
            jsonPath("$.guest.email") { value("elena@example.com") }
        }

        mockMvc.post("/bookings") {
            contentType = MediaType.APPLICATION_JSON
            content = payload
        }.andExpect {
            status { isConflict() }
            jsonPath("$.code") { value("slot_not_available") }
        }
    }

    private fun String.asJson(): JsonNode = objectMapper.readTree(this)
}
