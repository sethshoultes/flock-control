import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Count } from "@shared/schema";
import { format } from "date-fns";

interface CountHistoryProps {
  counts: Count[];
}

export function CountHistory({ counts }: CountHistoryProps) {
  if (counts.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No counts recorded yet
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[300px] w-full rounded-md border">
      <div className="p-4 space-y-4">
        {counts.map((count) => (
          <Card key={count.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {count.count} {count.count === 1 ? 'chicken' : 'chickens'}
              </div>
              <div className="text-sm text-muted-foreground">
                {count.timestamp ? format(new Date(count.timestamp), 'MMM d, yyyy h:mm a') : 'No date'}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}