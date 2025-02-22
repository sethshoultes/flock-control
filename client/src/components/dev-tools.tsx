import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, BookOpen } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function DevTools() {
  const { isOnline, setOnline, resetTutorial } = useAppStore();

  const handleResetTutorial = () => {
    resetTutorial().catch(console.error);
  };

  const handleToggleOnline = () => {
    setOnline(!isOnline);
  };

  return (
    <div className="fixed bottom-4 right-4 flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleResetTutorial}
        className="bg-purple-100 hover:bg-purple-200"
      >
        <BookOpen className="h-4 w-4 mr-2 text-purple-600" />
        Show Tutorial
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleOnline}
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