import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ConnectionLog {
  timestamp: string;
  status: 'success' | 'error';
  message: string;
}

export function DatabaseDebug() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ConnectionLog[]>([]);

  // Query for initial database health check
  const { data: healthData } = useQuery({
    queryKey: ['/api/health'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/health');
      return res.json();
    },
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Mutation for manual connection test
  const testConnection = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Connection failed');
      return res.json();
    },
    onSuccess: (data) => {
      const newLog: ConnectionLog = {
        timestamp: new Date().toISOString(),
        status: data.status === 'healthy' ? 'success' : 'error',
        message: `Database ${data.database}. ${data.error || ''}`
      };
      setLogs(prev => [newLog, ...prev]);

      toast({
        title: data.status === 'healthy' ? 'Connection Success' : 'Connection Error',
        description: `Database is ${data.database}`,
        variant: data.status === 'healthy' ? 'default' : 'destructive'
      });
    },
    onError: (error) => {
      const newLog: ConnectionLog = {
        timestamp: new Date().toISOString(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      setLogs(prev => [newLog, ...prev]);

      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to test connection',
        variant: 'destructive'
      });
    }
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`${
          healthData?.status === 'healthy' 
            ? "bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30" 
            : "bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30"
        }`}
      >
        <Database className={`h-4 w-4 mr-2 ${
          healthData?.status === 'healthy' 
            ? "text-green-600 dark:text-green-400" 
            : "text-red-600 dark:text-red-400"
        }`} />
        <span className={healthData?.status === 'healthy' 
          ? "text-green-700 dark:text-green-300" 
          : "text-red-700 dark:text-red-300"
        }>
          Database {healthData?.status === 'healthy' ? 'Connected' : 'Disconnected'}
        </span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Connection Debug
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={healthData?.status === 'healthy' ? 'default' : 'destructive'}>
                  {healthData?.status === 'healthy' ? 'Connected' : 'Disconnected'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last checked: {new Date().toLocaleTimeString()}
                </span>
              </div>
              <Button 
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
              >
                Test Connection
              </Button>
            </div>

            <div className="rounded-md border">
              <ScrollArea className="h-[300px] w-full rounded-md">
                <div className="p-4 space-y-4">
                  {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      No connection logs yet
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg text-sm ${
                          log.status === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/10' 
                            : 'bg-red-50 dark:bg-red-900/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={log.status === 'success' 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                          }>
                            {log.message}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}