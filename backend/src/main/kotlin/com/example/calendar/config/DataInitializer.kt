package com.example.calendar.config

import com.example.calendar.domain.EventTypeEntity
import com.example.calendar.repository.EventTypeRepository
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.OffsetDateTime

@Component
class DataInitializer(
    private val eventTypeRepository: EventTypeRepository,
    private val clock: Clock,
) : ApplicationRunner {
    override fun run(args: ApplicationArguments) {
        if (eventTypeRepository.count() > 0) {
            return
        }

        val now = OffsetDateTime.now(clock)
        eventTypeRepository.saveAll(
            listOf(
                EventTypeEntity(
                    id = "intro-call",
                    name = "Intro call",
                    description = "A short meeting to understand the request and agree on next steps.",
                    durationMinutes = 30,
                    createdAt = now.minusDays(9),
                ),
                EventTypeEntity(
                    id = "product-review",
                    name = "Product review",
                    description = "A detailed session about an interface, API, or product roadmap.",
                    durationMinutes = 60,
                    createdAt = now.minusDays(8),
                ),
            ),
        )
    }
}
