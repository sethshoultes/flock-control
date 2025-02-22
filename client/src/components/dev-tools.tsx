import { Button } from "@/components/ui/button";
import { Wifi, WifiOff } from "lucide-react";
import { useCountStore } from "@/lib/store";

export function DevTools() {
  const { isOnline, setOnline } = useCountStore();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4">
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
