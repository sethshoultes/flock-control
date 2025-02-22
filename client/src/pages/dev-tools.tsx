import { DatabaseDebug } from "@/components/database-debug";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { Wifi, WifiOff, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DevTools() {
  const store = useAppStore();
  const { toast } = useToast();

  const handleResetTutorial = async () => {
    try {
      await store.resetTutorial();
      toast({
        title: "Success",
        description: "Tutorial has been reset. Return to home page to see it.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset tutorial",
        variant: "destructive",
      });
    }
  };

  const handleToggleOnline = () => {
    store.setOnline(!store.isOnline);
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Development Tools</CardTitle>
          <CardDescription>
            Tools and utilities to help with development and debugging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Network Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Network Status</h3>
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

          {/* Database Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Database Connection</h3>
            <DatabaseDebug />
          </div>

          {/* Tutorial Reset */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tutorial</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTutorial}
              className="bg-purple-100 hover:bg-purple-200"
            >
              <BookOpen className="h-4 w-4 mr-2 text-purple-600" />
              Reset Tutorial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}