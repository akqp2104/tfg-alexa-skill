const scenes = require("../story/scenes");

const INITIAL_SCENE_ID = "scene_1";

function getScene(sceneId) {
  return scenes[sceneId] || null;
}

function getInitialScene() {
  return getScene(INITIAL_SCENE_ID);
}

function getInitialSceneId() {
  return INITIAL_SCENE_ID;
}

function getNextScene(currentSceneId, choice) {
  const currentScene = getScene(currentSceneId);

  if (!currentScene) {
    return {
      success: false,
      error: "SCENE_NOT_FOUND",
    };
  }

  if (!currentScene.choices) {
    return {
      success: false,
      error: "NO_CHOICES_AVAILABLE",
    };
  }

  const selectedChoice = currentScene.choices[choice];

  if (!selectedChoice) {
    return {
      success: false,
      error: "INVALID_CHOICE",
    };
  }

  const nextSceneId = selectedChoice.nextScene;
  const nextScene = getScene(nextSceneId);

  if (!nextScene) {
    return {
      success: false,
      error: "NEXT_SCENE_NOT_FOUND",
    };
  }

  return {
    success: true,
    sceneId: nextSceneId,
    scene: nextScene,
  };
}

module.exports = {
  getScene,
  getInitialScene,
  getInitialSceneId,
  getNextScene,
};
