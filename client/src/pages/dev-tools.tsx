import { DatabaseDebug } from "@/components/database-debug";
import { UserInspector } from "@/components/user-inspector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { BookOpen, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDiagnostic } from "@/hooks/use-diagnostic";
import { useAuth } from "@/hooks/use-auth";

export default function DevTools() {
  const store = useAppStore();
  const { toast } = useToast();
  const { downloadReport } = useDiagnostic();
  const { user } = useAuth();

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
          {/* Database Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Database Connection</h3>
            <DatabaseDebug />
          </div>

          {/* User Data Inspector - Show for all logged in users */}
          {user && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">User Data Inspector</h3>
              <p className="text-sm text-muted-foreground">
                View your user data and count history
              </p>
              <UserInspector />
            </div>
          )}

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

          {/* Diagnostic Report */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Diagnostics</h3>
            <p className="text-sm text-muted-foreground">
              Generate a report containing system state and diagnostic information
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadReport}
              className="bg-blue-100 hover:bg-blue-200"
            >
              <FileDown className="h-4 w-4 mr-2 text-blue-600" />
              Download Diagnostic Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}