function getNextScene(currentSceneId, choice) {
  const currentScene = getScene(currentSceneId);

  if (!currentScene) {
    return {
      success: false,
      error: "SCENE_NOT_FOUND",
    };
  }

  const selectedChoice = currentScene.choices?.[choice];

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
    indicators: selectedChoice.indicators || {},
  };
}
