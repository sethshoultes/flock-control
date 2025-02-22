import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Count } from "@shared/schema";
import { format } from "date-fns";
import { useCountStore } from "@/lib/store";
import { Cloud, CloudOff } from "lucide-react";

interface CountHistoryProps {
  counts: Count[];
}

export function CountHistory({ counts: serverCounts }: CountHistoryProps) {
  const { counts: localCounts, isOnline } = useCountStore();

  // Combine and sort counts from both sources
  const allCounts = [...localCounts, ...serverCounts]
    .sort((a, b) => {
      const timeA = a.timestamp?.getTime() ?? 0;
      const timeB = b.timestamp?.getTime() ?? 0;
      return timeB - timeA;
    });

  if (allCounts.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No counts recorded yet
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[300px] w-full rounded-md border">
      <div className="p-4 space-y-4">
        {allCounts.map((count) => (
          <Card key={count.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {count.count} {count.count === 1 ? 'chicken' : 'chickens'}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {count.timestamp ? format(new Date(count.timestamp), 'MMM d, yyyy h:mm a') : 'No date'}
                </div>
                {isOnline ? (
                  <Cloud className="h-4 w-4 text-blue-500" />
                ) : (
                  <CloudOff className="h-4 w-4 text-orange-500" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}