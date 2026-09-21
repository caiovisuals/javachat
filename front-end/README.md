# FRONT-END JAVACHAT

Interface web da aplicação utilizando Angular 21 com Tailwind CSS.

## Decisões

- **Angular 21 standalone e zoneless**, com estado em `signal()` / `computed()` dentro dos services de domínio — sem NgRx
- **Tailwind CSS v4** configurado por `@theme` no CSS, com tokens de cor próprios e tema escuro via `prefers-color-scheme`
- **Angular CDK** para o que é comportamento e não estilo: `cdk-virtual-scroll` no histórico, `Overlay` no diálogo de chamada recebida, utilitários de acessibilidade e foco
- **`@stomp/stompjs`** para o tempo real, com reconexão em backoff e reassinatura automática
- **WebRTC nativo** (`RTCPeerConnection`, `getUserMedia`), sem biblioteca intermediária