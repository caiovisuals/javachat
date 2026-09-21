package com.caiovisuals.javachat.common.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException e, HttpServletRequest request) {
        return ResponseEntity.status(e.getStatus())
                .body(
                        ErrorResponse.of(
                                e.getStatus().value(), e.getCode(), e.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException e, HttpServletRequest request) {

        Map<String, String> errors = new LinkedHashMap<>();
        e.getBindingResult()
                .getFieldErrors()
                .forEach(field -> errors.putIfAbsent(field.getField(), field.getDefaultMessage()));

        return ResponseEntity.badRequest()
                .body(ErrorResponse.validation(request.getRequestURI(), errors));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            NoResourceFoundException e, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(
                        ErrorResponse.of(
                                404, "NOT_FOUND", "Recurso não encontrado.", request.getRequestURI()));
    }

    /**
     * A mensagem real fica no log, não na resposta: detalhe de exceção conta ao atacante como o sistema é feito por dentro
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e, HttpServletRequest request) {
        log.error("Falha não tratada em {}", request.getRequestURI(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        ErrorResponse.of(
                                500, "INTERNAL_ERROR", "Erro inesperado.", request.getRequestURI()));
    }
}