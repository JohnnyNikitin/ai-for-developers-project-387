package com.example.calendar.web

import com.example.calendar.generated.api.GuestBookingsApi
import com.example.calendar.generated.model.Booking
import com.example.calendar.generated.model.CreateBookingRequest
import com.example.calendar.service.CalendarService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class GuestBookingsController(
    private val calendarService: CalendarService,
) : GuestBookingsApi {
    override fun create(request: CreateBookingRequest): ResponseEntity<Booking> =
        ResponseEntity.status(HttpStatus.CREATED).body(calendarService.createBooking(request))
}
