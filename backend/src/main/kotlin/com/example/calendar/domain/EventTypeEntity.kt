package com.example.calendar.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime

@Entity
@Table(name = "event_types")
class EventTypeEntity(
    @Id
    @Column(nullable = false, updatable = false)
    var id: String = "",

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false, length = 2_000)
    var description: String = "",

    @Column(nullable = false)
    var durationMinutes: Int = 0,

    @Column(nullable = false, updatable = false)
    var createdAt: OffsetDateTime = OffsetDateTime.now(),
)
