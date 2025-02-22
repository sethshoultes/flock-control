import { useState, useEffect } from "react";
import { get, set } from "idb-keyval";

const TUTORIAL_KEY = "chicken-counter-tutorial-shown";

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load tutorial state on mount
  useEffect(() => {
    let mounted = true;

    async function checkTutorialStatus() {
      try {
        const hasSeenTutorial = await get(TUTORIAL_KEY);
        console.log("Tutorial status from IndexedDB:", hasSeenTutorial);

        // Only update state if component is still mounted
        if (mounted) {
          setShowTutorial(hasSeenTutorial === null || hasSeenTutorial === false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to check tutorial status:", error);
        if (mounted) {
          setShowTutorial(true);
          setIsLoading(false);
        }
      }
    }

    checkTutorialStatus();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []);

  const completeTutorial = async () => {
    try {
      await set(TUTORIAL_KEY, true);
      setShowTutorial(false);
      console.log("Tutorial completed and saved to IndexedDB");
    } catch (error) {
      console.error("Failed to save tutorial status:", error);
    }
  };

  const resetTutorial = async () => {
    try {
      console.log("Resetting tutorial...");
      await set(TUTORIAL_KEY, false);
      setShowTutorial(true);
      console.log("Tutorial reset successful");
    } catch (error) {
      console.error("Failed to reset tutorial status:", error);
      // Show error toast or handle error appropriately
    }
  };

  return {
    showTutorial,
    isLoading,
    completeTutorial,
    resetTutorial,
  };
}