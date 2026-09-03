# Narrativa Interactiva Adaptativa

Skill de Alexa que genera una historia interactiva mediante Gemini. En cada
escena, la persona elige cómo continuar y el sistema adapta la narración,
controla su progreso y ofrece una evaluación orientativa al finalizar.

El contenido de la partida se mantiene únicamente en los atributos de sesión
de Alexa. No se conserva un historial entre sesiones ni se registran en los
logs las respuestas, los prompts o las evidencias textuales.

## Funcionamiento general

Cada turno sigue este flujo:

```text
Respuesta de voz
      ↓
Comprobación de seguridad
      ↓
Análisis y actualización de indicadores
      ↓
Selección del progreso y foco narrativo
      ↓
Generación de la siguiente escena
      ↓
Resumen periódico o evaluación final
      ↓
Respuesta de Alexa
```

La historia puede terminar cuando alcanza la fase de resolución y Gemini
genera un cierre válido. Si no termina antes, la escena 14 actúa como límite
máximo y fuerza el desenlace.

## Estructura del código

```text
src/
├── handlers/       Entrada y salida de solicitudes de Alexa
├── services/       Lógica de juego, seguridad, narrativa y evaluación
├── prompts/        Instrucciones enviadas al modelo
├── schemas/        Contratos JSON Schema y validación con Zod
├── config/         Umbrales y configuración del progreso
├── state/          Estado inicial de una partida
├── observability/  Registro estructurado de métricas
├── scripts/        Herramientas manuales de apoyo
├── tests/          Pruebas deterministas sin llamadas reales a Gemini
└── validators/     Reglas semánticas adicionales
```

[`gameService.js`](src/services/gameService.js) coordina el turno completo. Los
handlers reciben las solicitudes de Alexa y delegan en los servicios
especializados. Las respuestas del modelo se validan antes de modificar el
estado de la partida.

## Instalación de la skill

Cuando la skill esté publicada:

1. Abre la aplicación de Alexa.
2. Entra en **Más → Skills y juegos**.
3. Busca **Narrativa Interactiva Adaptativa**.
4. Selecciona **Activar para usar**.

También podrá activarse desde el enlace de la tienda de skills cuando este se
encuentre disponible. No requiere crear una cuenta propia ni vincular un
servicio externo.

## Uso

1. Di «Alexa, abre narrativa adaptativa».
2. Escucha la escena y las opciones propuestas.
3. Responde con una opción o expresa de forma natural qué quieres hacer.
4. Continúa hasta que la historia llegue a su desenlace.

Se puede decir «ayuda» para obtener orientación o «parar» para terminar la
sesión. La evaluación final es orientativa, se basa exclusivamente en las
respuestas y decisiones realizadas durante la experiencia y no constituye un
diagnóstico.

## Desarrollo

Requiere Node.js y las dependencias declaradas en `package.json`.

```bash
npm install
npm test
```

La prueba manual contra Gemini es independiente de los tests y consume cuota:

```bash
npm run test:gemini
```

Necesita `GEMINI_API_KEY`; el modelo puede configurarse mediante `LLM_MODEL`.
Las métricas técnicas y su análisis se describen en
[`docs/metrics.md`](docs/metrics.md).
