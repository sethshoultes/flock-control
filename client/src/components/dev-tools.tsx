import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, BookOpen } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DatabaseDebug } from "./database-debug";

export function DevTools() {
  const store = useAppStore();

  const handleResetTutorial = () => {
    store.resetTutorial().catch(console.error);
  };

  const handleToggleOnline = () => {
    store.setOnline(!store.isOnline);
  };

  return (
    <div className="fixed bottom-4 right-4 flex gap-2">
      <DatabaseDebug />

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
        className={store.isOnline ? "bg-green-100" : "bg-orange-100"}
      >
        {store.isOnline ? (
          <Wifi className="h-4 w-4 mr-2 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 mr-2 text-orange-600" />
        )}
        {store.isOnline ? "Online" : "Offline"}
      </Button>
    </div>
  );
}