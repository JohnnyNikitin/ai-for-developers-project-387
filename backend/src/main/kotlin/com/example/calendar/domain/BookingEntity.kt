package com.example.calendar.domain

import jakarta.persistence.*
import java.time.OffsetDateTime

@Entity
@Table(
    name = "bookings",
    indexes = [
        Index(name = "idx_bookings_status_starts_at", columnList = "status, starts_at"),
    ],
    uniqueConstraints = [
        UniqueConstraint(name = "uk_bookings_starts_at", columnNames = ["starts_at"]),
    ],
)
class BookingEntity(
    @Id
    @Column(nullable = false, updatable = false)
    var id: String = "",

    @Column(nullable = false)
    var eventTypeId: String = "",

    @Column(nullable = false)
    var eventTypeName: String = "",

    @Column(nullable = false)
    var durationMinutes: Int = 0,

    @Column(name = "starts_at", nullable = false)
    var startsAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(nullable = false)
    var endsAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(nullable = false)
    var guestName: String = "",

    @Column(nullable = false)
    var guestEmail: String = "",

    @Column(nullable = false)
    var status: String = "confirmed",

    @Column(nullable = false, updatable = false)
    var createdAt: OffsetDateTime = OffsetDateTime.now(),
)
