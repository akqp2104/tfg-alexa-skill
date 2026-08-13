const audioUrls = [
  "https://tfg-alexa-skill.s3.eu-west-1.amazonaws.com/audio/intro1.mp3",
  "https://tfg-alexa-skill.s3.eu-west-1.amazonaws.com/audio/intro2.mp3",
  "https://tfg-alexa-skill.s3.eu-west-1.amazonaws.com/audio/intro3.mp3",
  "https://tfg-alexa-skill.s3.eu-west-1.amazonaws.com/audio/intro4.mp3",
  "https://tfg-alexa-skill.s3.eu-west-1.amazonaws.com/audio/intro5.mp3",
];

function getRandomAudioUrl() {
  const randomIndex = Math.floor(Math.random() * audioUrls.length);
  return audioUrls[randomIndex];
}

async function sendSsml(handlerInput, ssml) {
  try {
    const directiveServiceClient =
      handlerInput.serviceClientFactory.getDirectiveServiceClient();

    const requestId = handlerInput.requestEnvelope.request.requestId;

    const directive = {
      header: {
        requestId,
      },

      directive: {
        type: "VoicePlayer.Speak",
        speech: ssml,
      },
    };

    console.log(
      "Sending progressive directive:",
      JSON.stringify(directive, null, 2),
    );

    await directiveServiceClient.enqueue(directive);

    console.log("Progressive directive accepted by Alexa");
  } catch (error) {
    console.error("Progressive response error:", error);
  }
}

async function sendAudio(handlerInput) {
  const audioUrl = getRandomAudioUrl();

  const ssml = `<speak><audio src="${audioUrl}"/></speak>`;
  console.log("Sending progressive response with audio:", audioUrl);
  return sendSsml(handlerInput, ssml);
}

async function sendText(handlerInput, text) {
  const ssml = `<speak>${text}</speak>`;

  return sendSsml(handlerInput, ssml);
}

module.exports = {
  sendAudio,
  sendText,
};
