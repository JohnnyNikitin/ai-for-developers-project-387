package com.example.calendar.web

import com.example.calendar.generated.api.BookingTypesApi
import com.example.calendar.generated.model.AvailabilityWindow
import com.example.calendar.generated.model.BookingTypeSummary
import com.example.calendar.service.CalendarService
import org.springframework.web.bind.annotation.RestController

@RestController
class BookingTypesController(
    private val calendarService: CalendarService,
) : BookingTypesApi {
    override fun list(): List<BookingTypeSummary> = calendarService.listBookingTypes()

    override fun getAvailability(eventTypeId: String): AvailabilityWindow =
        calendarService.getAvailability(eventTypeId)
}
