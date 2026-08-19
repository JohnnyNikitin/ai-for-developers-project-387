package com.example.calendar.repository

import com.example.calendar.domain.EventTypeEntity
import org.springframework.data.jpa.repository.JpaRepository

interface EventTypeRepository : JpaRepository<EventTypeEntity, String> {
    fun findAllByOrderByCreatedAtAsc(): List<EventTypeEntity>
}
