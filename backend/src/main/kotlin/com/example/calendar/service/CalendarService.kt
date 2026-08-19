package com.example.calendar.service

import com.example.calendar.domain.BookingEntity
import com.example.calendar.domain.EventTypeEntity
import com.example.calendar.generated.model.*
import com.example.calendar.repository.BookingRepository
import com.example.calendar.repository.EventTypeRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.*
import java.util.*

@Service
class CalendarService(
    private val eventTypeRepository: EventTypeRepository,
    private val bookingRepository: BookingRepository,
    private val clock: Clock,
) {
    private val dayStartsAt = LocalTime.of(8, 0)
    private val dayEndsAt = LocalTime.of(17, 0)
    private val bookingWindowDays = 14L

    @Transactional
    fun createEventType(request: CreateEventTypeRequest): EventType {
        validateEventTypeRequest(request)

        if (eventTypeRepository.existsById(request.id)) {
            throw CalendarApiException(
                HttpStatus.CONFLICT,
                ErrorCode.EVENT_TYPE_ID_ALREADY_EXISTS,
                "Event type '${request.id}' already exists.",
            )
        }

        val entity = EventTypeEntity(
            id = request.id.trim(),
            name = request.name.trim(),
            description = request.description.trim(),
            durationMinutes = request.durationMinutes,
            createdAt = OffsetDateTime.now(clock),
        )

        return eventTypeRepository.save(entity).toApi()
    }

    @Transactional(readOnly = true)
    fun listEventTypes(): List<EventType> =
        eventTypeRepository.findAllByOrderByCreatedAtAsc().map { it.toApi() }

    @Transactional(readOnly = true)
    fun listBookingTypes(): List<BookingTypeSummary> =
        eventTypeRepository.findAllByOrderByCreatedAtAsc().map {
            BookingTypeSummary(
                id = it.id,
                name = it.name,
                description = it.description,
                durationMinutes = it.durationMinutes,
            )
        }

    @Transactional(readOnly = true)
    fun getAvailability(eventTypeId: String): AvailabilityWindow {
        val eventType = findEventType(eventTypeId)
        val windowStart = currentWindowStart()
        val windowEnd = windowStart.plusDays(bookingWindowDays)

        val slots = generateSlots(eventType, windowStart, windowEnd)
            .filterNot { bookingRepository.existsByStartsAtAndStatus(it.startsAt, CONFIRMED_STATUS) }

        return AvailabilityWindow(
            eventTypeId = eventType.id,
            windowStartsOn = windowStart,
            windowEndsOn = windowEnd,
            slots = slots,
        )
    }

    @Transactional
    fun createBooking(request: CreateBookingRequest): Booking {
        validateBookingRequest(request)

        val eventType = findEventType(request.eventTypeId)
        val startsAt = request.startsAt.withOffsetSameInstant(ZoneOffset.UTC)
        val windowStart = currentWindowStart()
        val windowEnd = windowStart.plusDays(bookingWindowDays)

        if (startsAt.toLocalDate().isBefore(windowStart) || !startsAt.toLocalDate().isBefore(windowEnd)) {
            throw CalendarApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                ErrorCode.SLOT_OUTSIDE_BOOKING_WINDOW,
                "Slot must be inside the current 14-day booking window.",
            )
        }

        val isGeneratedSlot = generateSlots(eventType, windowStart, windowEnd).any { it.startsAt == startsAt }
        if (!isGeneratedSlot || bookingRepository.existsByStartsAtAndStatus(startsAt, CONFIRMED_STATUS)) {
            throw CalendarApiException(
                HttpStatus.CONFLICT,
                ErrorCode.SLOT_NOT_AVAILABLE,
                "Selected slot is no longer available.",
            )
        }

        val booking = BookingEntity(
            id = "bk-${UUID.randomUUID()}",
            eventTypeId = eventType.id,
            eventTypeName = eventType.name,
            durationMinutes = eventType.durationMinutes,
            startsAt = startsAt,
            endsAt = startsAt.plusMinutes(eventType.durationMinutes.toLong()),
            guestName = request.guest.name.trim(),
            guestEmail = request.guest.email.trim(),
            status = CONFIRMED_STATUS,
            createdAt = OffsetDateTime.now(clock),
        )

        return try {
            bookingRepository.saveAndFlush(booking).toApi()
        } catch (exception: DataIntegrityViolationException) {
            throw CalendarApiException(
                HttpStatus.CONFLICT,
                ErrorCode.SLOT_NOT_AVAILABLE,
                "Selected slot is no longer available.",
            )
        }
    }

    @Transactional(readOnly = true)
    fun listUpcomingBookings(): List<Booking> =
        bookingRepository
            .findAllByStatusAndStartsAtGreaterThanEqualOrderByStartsAtAsc(
                CONFIRMED_STATUS,
                OffsetDateTime.now(clock),
            )
            .map { it.toApi() }

    private fun findEventType(eventTypeId: String): EventTypeEntity =
        eventTypeRepository.findById(eventTypeId).orElseThrow {
            CalendarApiException(
                HttpStatus.NOT_FOUND,
                ErrorCode.EVENT_TYPE_NOT_FOUND,
                "Event type '$eventTypeId' was not found.",
            )
        }

    private fun generateSlots(
        eventType: EventTypeEntity,
        windowStart: LocalDate,
        windowEnd: LocalDate,
    ): List<AvailableSlot> =
        generateSequence(windowStart) { it.plusDays(1) }
            .takeWhile { it.isBefore(windowEnd) }
            .flatMap { date ->
                generateSequence(date.atTime(dayStartsAt).atOffset(ZoneOffset.UTC)) {
                    it.plusMinutes(eventType.durationMinutes.toLong())
                }.takeWhile { it.plusMinutes(eventType.durationMinutes.toLong()).toLocalTime() <= dayEndsAt }
            }
            .map {
                AvailableSlot(
                    startsAt = it,
                    endsAt = it.plusMinutes(eventType.durationMinutes.toLong()),
                )
            }
            .toList()

    private fun currentWindowStart(): LocalDate = LocalDate.now(clock)

    private fun validateEventTypeRequest(request: CreateEventTypeRequest) {
        if (
            request.id.isBlank() ||
            request.name.isBlank() ||
            request.description.isBlank() ||
            request.durationMinutes < 1
        ) {
            throw validationFailed("Event type id, name, description and positive duration are required.")
        }
    }

    private fun validateBookingRequest(request: CreateBookingRequest) {
        if (
            request.eventTypeId.isBlank() ||
            request.guest.name.isBlank() ||
            request.guest.email.isBlank()
        ) {
            throw validationFailed("Event type id and guest contact data are required.")
        }
    }

    private fun validationFailed(message: String): CalendarApiException =
        CalendarApiException(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.VALIDATION_FAILED, message)

    private fun EventTypeEntity.toApi(): EventType =
        EventType(
            id = id,
            name = name,
            description = description,
            durationMinutes = durationMinutes,
            createdAt = createdAt,
        )

    private fun BookingEntity.toApi(): Booking =
        Booking(
            id = id,
            eventTypeId = eventTypeId,
            eventTypeName = eventTypeName,
            durationMinutes = durationMinutes,
            startsAt = startsAt,
            endsAt = endsAt,
            guest = GuestContact(name = guestName, email = guestEmail),
            status = BookingStatus.CONFIRMED,
            createdAt = createdAt,
        )

    private companion object {
        const val CONFIRMED_STATUS = "confirmed"
    }
}
