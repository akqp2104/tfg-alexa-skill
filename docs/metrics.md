# Métricas técnicas

Los eventos técnicos se escriben como JSON de una sola línea. No contienen
prompts, respuestas, evidencias textuales ni identificadores del usuario.

Eventos principales:

- `TURN_COMPLETED`: latencia total y por etapa, retries, fallback y resumen
- `LLM_CALL_SUCCESS` y `LLM_CALL_FAILED`: latencia, tarea, modelo y tokens
- `LLM_RETRY` y `LLM_RETRY_COMPLETED`: motivo y coste temporal del reintento
- `NARRATIVE_FALLBACK`: motivo del fallback y tiempo consumido
- `NARRATIVE_SUMMARY`: duración y resultado del resumen periódico

Tras exportar de CloudWatch los eventos como JSONL, se puede generar un informe
JSON:

```bash
npm run metrics:analyze -- metrics.jsonl
```

También se puede producir una tabla Markdown lista para incorporar a la memoria:

```bash
npm run metrics:analyze -- metrics.jsonl --markdown
```

El script acepta igualmente datos por la entrada estándar:

```bash
npm run metrics:analyze -- --markdown < metrics.jsonl
```

El informe incluye medias, máximos, P50 y P95; compara turnos con y sin retry,
turnos con y sin resumen, y calcula los porcentajes de retry, fallback, resumen
y respuestas que superan ocho segundos. También separa latencia y consumo de
tokens entre llamadas LLM válidas y fallidas.
