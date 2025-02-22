import { useState, useEffect } from "react";
import { get, set } from "idb-keyval";
import { useToast } from "@/hooks/use-toast";

const TUTORIAL_KEY = "chicken-counter-tutorial-shown";

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load tutorial state on mount
  useEffect(() => {
    let mounted = true;

    async function initializeTutorialState() {
      try {
        const hasSeenTutorial = await get(TUTORIAL_KEY);
        console.log("Tutorial state loaded:", hasSeenTutorial);

        if (mounted) {
          // Show tutorial if never shown before (null) or explicitly set to false
          setShowTutorial(hasSeenTutorial === null || hasSeenTutorial === false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load tutorial state:", error);
        if (mounted) {
          // Default to showing tutorial on error
          setShowTutorial(true);
          setIsLoading(false);
          toast({
            title: "Warning",
            description: "Could not load tutorial state",
            variant: "destructive",
          });
        }
      }
    }

    initializeTutorialState();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const completeTutorial = async () => {
    try {
      await set(TUTORIAL_KEY, true);
      setShowTutorial(false);
      console.log("Tutorial marked as completed");
    } catch (error) {
      console.error("Failed to save tutorial completion:", error);
      toast({
        title: "Error",
        description: "Could not save tutorial state",
        variant: "destructive",
      });
    }
  };

  const resetTutorial = async () => {
    try {
      console.log("Resetting tutorial state...");
      await set(TUTORIAL_KEY, false);
      setShowTutorial(true);
      console.log("Tutorial reset successful");
      toast({
        title: "Success",
        description: "Tutorial reset successfully",
      });
    } catch (error) {
      console.error("Failed to reset tutorial:", error);
      toast({
        title: "Error",
        description: "Could not reset tutorial",
        variant: "destructive",
      });
    }
  };

  return {
    showTutorial,
    isLoading,
    completeTutorial,
    resetTutorial,
  };
}