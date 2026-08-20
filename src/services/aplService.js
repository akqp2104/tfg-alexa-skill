const SPEECH_MARKS_MIN_VERSION = "2023.1";

function createChoicesPanel(opacity) {
  return {
    type: "Container",
    id: "choicesPanel",
    width: "80vw",
    opacity,
    alignItems: "center",
    items: [
      {
        type: "Text",
        text: "${payload.choices.properties.title}",
        width: "80vw",
        textAlign: "center",
        fontSize: "38dp",
        fontWeight: "700",
        color: "#FFFFFF",
      },
      {
        type: "Sequence",
        width: "80vw",
        height: "62vh",
        spacing: "28dp",
        scrollDirection: "vertical",
        alignItems: "center",
        data: "${payload.choices.properties.options}",
        items: [
          {
            type: "Text",
            text: "${data.label}",
            width: "80vw",
            textAlign: "left",
            fontSize: "${viewport.width < 600 ? '22dp' : '26dp'}",
            color: "#FFFFFF",
            spacing: "16dp",
            maxLines: 0,
          },
        ],
      },
    ],
  };
}

function createRoot(items, onMount = []) {
  return {
    type: "Container",
    width: "100vw",
    height: "100vh",
    paddingLeft: "8vw",
    paddingRight: "8vw",
    paddingTop: "6vh",
    paddingBottom: "6vh",
    justifyContent: "center",
    alignItems: "center",
    onMount,
    items,
  };
}

const STATIC_CHOICES_DOCUMENT = {
  type: "APL",
  version: "1.0",
  theme: "dark",
  mainTemplate: {
    parameters: ["payload"],
    item: createRoot([createChoicesPanel(1)]),
  },
};

const SPOKEN_CHOICES_DOCUMENT = {
  type: "APL",
  version: SPEECH_MARKS_MIN_VERSION,
  theme: "dark",
  mainTemplate: {
    parameters: ["payload"],
    item: createRoot(
      [
        {
          type: "Text",
          id: "speechDriver",
          width: "1dp",
          height: "1dp",
          opacity: 0,
          text: " ",
          speech: "${payload.choices.properties.speech}",
          onSpeechMark: [
            {
              when:
                "${event.markType == 'ssml' && event.markValue == 'show-options'}",
              type: "SetValue",
              componentId: "choicesPanel",
              property: "opacity",
              value: 1,
            },
          ],
        },
        createChoicesPanel(0),
      ],
      [
        {
          type: "Sequential",
          sequencer: "NarrationSequencer",
          screenLock: true,
          commands: [
            {
              type: "SpeakItem",
              componentId: "speechDriver",
            },
            {
              type: "Idle",
              delay: 400,
            },
            {
              type: "SendEvent",
              arguments: ["narration-complete"],
            },
          ],
        },
      ],
    ),
  },
};

function supportsAPL(handlerInput) {
  return Boolean(getAPLInterface(handlerInput));
}

function supportsAplSpeech(handlerInput) {
  const aplInterface = getAPLInterface(handlerInput);
  const maxVersion = aplInterface?.runtime?.maxVersion;

  return Boolean(
    aplInterface &&
      maxVersion &&
      compareVersions(maxVersion, SPEECH_MARKS_MIN_VERSION) >= 0,
  );
}

function getAPLInterface(handlerInput) {
  return handlerInput.requestEnvelope.context?.System?.device
    ?.supportedInterfaces?.["Alexa.Presentation.APL"];
}

function addChoicesDocument(handlerInput, responseBuilder, choices, token) {
  if (!supportsAPL(handlerInput) || !choices?.length) {
    return responseBuilder;
  }

  return responseBuilder.addDirective(
    buildRenderDirective(STATIC_CHOICES_DOCUMENT, choices, token),
  );
}

function addSpokenChoicesDocument(
  handlerInput,
  responseBuilder,
  choices,
  token,
  spokenResponse,
) {
  const narrationSsml = buildMarkedSsml(spokenResponse);

  if (!supportsAplSpeech(handlerInput) || !choices?.length || !narrationSsml) {
    return false;
  }

  const directive = buildRenderDirective(
    SPOKEN_CHOICES_DOCUMENT,
    choices,
    token,
  );

  directive.datasources.choices.properties.narrationSsml = narrationSsml;
  directive.datasources.choices.transformers = [
    {
      transformer: "ssmlToSpeech",
      inputPath: "narrationSsml",
      outputName: "speech",
    },
  ];

  responseBuilder.addDirective(directive);

  return true;
}

function buildRenderDirective(document, choices, token) {
  return {
    type: "Alexa.Presentation.APL.RenderDocument",
    token: token || "choices",
    document,
    datasources: {
      choices: {
        type: "object",
        properties: {
          title: "¿Qué prefieres?",
          options: choices.map((choice, index) => ({
            label: `${index + 1}. ${choice.text}`,
          })),
        },
      },
    },
  };
}

function buildMarkedSsml(spokenResponse) {
  const marker = "tus opciones son";
  const markerIndex = spokenResponse?.toLowerCase().indexOf(marker) ?? -1;

  if (markerIndex < 0) {
    return null;
  }

  const beforeMarker = spokenResponse.slice(0, markerIndex);
  const fromMarker = spokenResponse.slice(markerIndex);

  return (
    `<speak>${escapeXml(beforeMarker)}` +
    `<mark name="show-options"/>${escapeXml(fromMarker)}</speak>`
  );
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function compareVersions(left, right) {
  const leftParts = String(left).split(".").map(Number);
  const rightParts = String(right).split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

module.exports = {
  supportsAPL,
  supportsAplSpeech,
  addChoicesDocument,
  addSpokenChoicesDocument,
  buildMarkedSsml,
};
