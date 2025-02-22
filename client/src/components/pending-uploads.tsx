import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { CloudOff, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function PendingUploads() {
  const { pendingUploads, isSyncing } = useAppStore();

  if (pendingUploads.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CloudOff className="h-5 w-5 text-orange-500" />
          Pending Uploads
          {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
        </h3>
        <span className="text-sm text-muted-foreground">
          {pendingUploads.length} image{pendingUploads.length !== 1 ? 's' : ''} waiting to sync
        </span>
      </div>

      <ScrollArea className="h-[200px] w-full rounded-md border">
        <div className="p-4 space-y-4">
          {pendingUploads.map((upload) => (
            <Card key={upload.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={upload.image}
                      alt="Pending"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {upload.retryCount > 0 ? 'Retrying sync...' : 'Waiting to sync'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(upload.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                {upload.retryCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Retry attempt: {upload.retryCount}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}