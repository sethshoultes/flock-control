import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, BookOpen } from "lucide-react";
import { useCountStore } from "@/lib/store";
import { useTutorial } from "@/hooks/use-tutorial";

export function DevTools() {
  const { isOnline, setOnline } = useCountStore();
  const { resetTutorial } = useTutorial();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={resetTutorial}
        className="bg-purple-100"
      >
        <BookOpen className="h-4 w-4 mr-2 text-purple-600" />
        Show Tutorial
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setOnline(!isOnline)}
        className={isOnline ? "bg-green-100" : "bg-orange-100"}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4 mr-2 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 mr-2 text-orange-600" />
        )}
        {isOnline ? "Online" : "Offline"}
      </Button>
    </div>
  );
}