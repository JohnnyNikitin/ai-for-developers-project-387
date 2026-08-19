package com.example.calendar.repository

import com.example.calendar.domain.BookingEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.time.OffsetDateTime

interface BookingRepository : JpaRepository<BookingEntity, String> {
    fun existsByStartsAtAndStatus(startsAt: OffsetDateTime, status: String): Boolean

    fun findAllByStatusAndStartsAtGreaterThanEqualOrderByStartsAtAsc(
        status: String,
        startsAt: OffsetDateTime,
    ): List<BookingEntity>
}
