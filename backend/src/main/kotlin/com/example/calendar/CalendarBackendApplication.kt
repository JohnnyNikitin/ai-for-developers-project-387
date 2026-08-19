package com.example.calendar

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class CalendarBackendApplication

fun main(args: Array<String>) {
    runApplication<CalendarBackendApplication>(*args)
}
