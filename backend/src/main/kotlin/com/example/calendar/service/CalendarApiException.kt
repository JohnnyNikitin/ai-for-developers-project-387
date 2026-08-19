package com.example.calendar.service

import com.example.calendar.generated.model.ErrorCode
import org.springframework.http.HttpStatus

class CalendarApiException(
    val status: HttpStatus,
    val code: ErrorCode,
    override val message: String,
) : RuntimeException(message)
