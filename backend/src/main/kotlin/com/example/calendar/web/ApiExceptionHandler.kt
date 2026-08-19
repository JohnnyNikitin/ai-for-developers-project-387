package com.example.calendar.web

import com.example.calendar.generated.model.ErrorCode
import com.example.calendar.generated.model.ErrorResponse
import com.example.calendar.service.CalendarApiException
import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(CalendarApiException::class)
    fun handleCalendarApiException(exception: CalendarApiException): ResponseEntity<ErrorResponse> =
        ResponseEntity
            .status(exception.status)
            .body(ErrorResponse(code = exception.code, message = exception.message))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(exception: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> =
        ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(
                ErrorResponse(
                    code = ErrorCode.VALIDATION_FAILED,
                    message = "Request validation failed.",
                ),
            )

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolationException(exception: ConstraintViolationException): ResponseEntity<ErrorResponse> =
        ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(
                ErrorResponse(
                    code = ErrorCode.VALIDATION_FAILED,
                    message = "Request validation failed.",
                ),
            )

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadableMessage(exception: HttpMessageNotReadableException): ResponseEntity<ErrorResponse> =
        ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ErrorResponse(
                    code = ErrorCode.VALIDATION_FAILED,
                    message = "Request body is invalid.",
                ),
            )
}
