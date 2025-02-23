import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { useAppStore } from "@/lib/store";
import { useToast } from "./use-toast";

interface SystemInfo {
  userAgent: string;
  timestamp: string;
  url: string;
  isOnline: boolean;
}

interface DiagnosticReport {
  systemInfo: SystemInfo;
  authState: {
    isAuthenticated: boolean;
    hasError: boolean;
    lastError?: string;
  };
  appState: {
    counts: number;
    showTutorial: boolean;
  };
  healthCheck?: {
    status: string;
    database: string;
    error?: string;
  };
}

export function useDiagnostic() {
  const { user, error: authError } = useAuth();
  const store = useAppStore();
  const { toast } = useToast();

  const collectSystemInfo = (): SystemInfo => ({
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    isOnline: navigator.onLine,
  });

  const generateReport = async (): Promise<DiagnosticReport> => {
    // Collect system information
    const systemInfo = collectSystemInfo();

    // Collect auth state
    const authState = {
      isAuthenticated: !!user,
      hasError: !!authError,
      lastError: authError?.message,
    };

    // Collect app state
    const appState = {
      counts: store.counts.length,
      showTutorial: store.showTutorial,
    };

    try {
      // Check API health
      const healthRes = await apiRequest("GET", "/api/health");
      const healthCheck = await healthRes.json();

      return {
        systemInfo,
        authState,
        appState,
        healthCheck,
      };
    } catch (error) {
      console.error("Failed to check API health:", error);
      return {
        systemInfo,
        authState,
        appState,
        healthCheck: {
          status: "error",
          database: "unknown",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  };

  const downloadReport = async () => {
    try {
      const report = await generateReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagnostic-report-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Diagnostic Report Generated",
        description: "The report has been downloaded to your computer.",
      });
    } catch (error) {
      console.error("Failed to generate diagnostic report:", error);
      toast({
        title: "Error",
        description: "Failed to generate diagnostic report",
        variant: "destructive",
      });
    }
  };

  return {
    generateReport,
    downloadReport,
  };
}
