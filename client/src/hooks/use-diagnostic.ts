import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { useAppStore } from "@/lib/store";
import { useToast } from "./use-toast";
import type { Count } from "@shared/schema";

interface SystemInfo {
  userAgent: string;
  timestamp: string;
  url: string;
  isOnline: boolean;
  ipAddress?: string;
}

interface DiagnosticReport {
  systemInfo: SystemInfo;
  authState: {
    isAuthenticated: boolean;
    hasError: boolean;
    lastError?: string;
    username?: string;
  };
  appState: {
    counts: Count[];
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

  const collectSystemInfo = async (): Promise<SystemInfo> => {
    // Get IP address from ipify API
    let ipAddress;
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ipAddress = data.ip;
    } catch (error) {
      console.error('Failed to fetch IP address:', error);
    }

    return {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      isOnline: navigator.onLine,
      ipAddress,
    };
  };

  const generateReport = async (): Promise<DiagnosticReport> => {
    // Collect system information
    const systemInfo = await collectSystemInfo();

    // Collect auth state with username
    const authState = {
      isAuthenticated: !!user,
      hasError: !!authError,
      lastError: authError?.message,
      username: user?.username,
    };

    // Collect app state including counts
    let counts: Count[] = [];
    if (user) {
      try {
        const res = await apiRequest("GET", "/api/counts");
        if (res.ok) {
          const data = await res.json();
          counts = data.counts;
        }
      } catch (error) {
        console.error('Failed to fetch counts for diagnostic:', error);
      }
    } else {
      counts = store.counts;
    }

    const appState = {
      counts,
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