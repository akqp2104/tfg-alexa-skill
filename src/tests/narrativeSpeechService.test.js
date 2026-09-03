const test = require("node:test");
const assert = require("node:assert/strict");

const narrativeSpeechService = require("../services/narrativeSpeechService");

const choices = [
  { id: "talk", text: "hablar con Marta" },
  { id: "leave", text: "salir de la cafetería" },
  { id: "wait", text: "esperar unos minutos" },
];

test("the spoken response always includes the generated choices", () => {
  assert.equal(
    narrativeSpeechService.buildResponse("Marta se acerca a tu mesa.", choices),
    "Marta se acerca a tu mesa. Tus opciones son: opción uno: hablar con Marta, opción dos: salir de la cafetería o opción tres: esperar unos minutos. ¿Qué prefieres?",
  );
});

test("the reprompt repeats the available choices", () => {
  assert.equal(
    narrativeSpeechService.buildReprompt(choices),
    "Puedes elegir entre opción uno: hablar con Marta, opción dos: salir de la cafetería o opción tres: esperar unos minutos. ¿Qué prefieres?",
  );
});

test("speech falls back safely when there are no choices", () => {
  assert.equal(
    narrativeSpeechService.buildResponse("La historia termina.", []),
    "La historia termina.",
  );
  assert.equal(
    narrativeSpeechService.buildReprompt([], "¿Quieres continuar?"),
    "¿Quieres continuar?",
  );
});
