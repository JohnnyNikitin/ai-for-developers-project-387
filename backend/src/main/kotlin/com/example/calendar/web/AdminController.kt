package com.example.calendar.web

import com.example.calendar.generated.api.AdminApi
import com.example.calendar.generated.model.Booking
import com.example.calendar.generated.model.CalendarOwnerProfile
import com.example.calendar.generated.model.CreateEventTypeRequest
import com.example.calendar.generated.model.EventType
import com.example.calendar.service.CalendarService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class AdminController(
    private val calendarService: CalendarService,
) : AdminApi {
    override fun getOwnerProfile(): CalendarOwnerProfile =
        CalendarOwnerProfile(
            id = "owner-default",
            displayName = "Calendar Owner",
            email = "owner@example.com",
        )

    override fun createEventType(request: CreateEventTypeRequest): ResponseEntity<EventType> =
        ResponseEntity.status(HttpStatus.CREATED).body(calendarService.createEventType(request))

    override fun listEventTypes(): List<EventType> = calendarService.listEventTypes()

    override fun listUpcomingBookings(): List<Booking> = calendarService.listUpcomingBookings()
}
