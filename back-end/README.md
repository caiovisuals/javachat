# BACK-END JAVACHAT

API REST + WebSocket da aplicação usando Java 21, Spring Boot e PostgreSQL.

## Responsabilidades

- Registro, login e sessão com JWT (access curto + refresh rotativo em cookie `httpOnly`)
- Conversas, mensagens e histórico paginado por cursor
- Entrega em tempo real via STOMP sobre WebSocket, presença e indicador de digitação
- Sinalização das chamadas WebRTC 1:1 e credenciais efêmeras de TURN