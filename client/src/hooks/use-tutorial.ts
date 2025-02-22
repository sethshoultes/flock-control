import { useState, useEffect } from "react";
import { get, set } from "idb-keyval";

const TUTORIAL_KEY = "chicken-counter-tutorial-shown";

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkTutorialStatus() {
      try {
        const hasSeenTutorial = await get(TUTORIAL_KEY);
        setShowTutorial(!hasSeenTutorial);
      } catch (error) {
        console.error("Failed to check tutorial status:", error);
        setShowTutorial(true);
      }
      setIsLoading(false);
    }

    checkTutorialStatus();
  }, []);

  const completeTutorial = async () => {
    try {
      await set(TUTORIAL_KEY, true);
      setShowTutorial(false);
    } catch (error) {
      console.error("Failed to save tutorial status:", error);
    }
  };

  const resetTutorial = async () => {
    try {
      await set(TUTORIAL_KEY, false);
      setShowTutorial(true);
    } catch (error) {
      console.error("Failed to reset tutorial status:", error);
    }
  };

  return {
    showTutorial,
    isLoading,
    completeTutorial,
    resetTutorial,
  };
}
