import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ImageModal } from "@/components/image-modal";
import type { Count } from "@shared/schema";
import { format } from "date-fns";
import { useCountStore } from "@/lib/store";
import { Cloud, CloudOff, Info, Image as ImageIcon, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface CountHistoryProps {
  counts: Count[];
}

export function CountHistory({ counts: serverCounts }: CountHistoryProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { counts: localCounts, deleteCounts } = useCountStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Combine and deduplicate counts from both sources
  const allCounts = Array.from(new Map(
    [...(localCounts || []), ...(serverCounts || [])]
      .map(count => [count.id, count])
  ).values())
    .sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("DELETE", "/api/counts", { countIds: ids });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Selected items have been deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete items",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);

    // Update local state first
    deleteCounts(ids);

    // Clear selection
    setSelectedIds(new Set());

    // If user is authenticated, also delete from server
    if (user) {
      const serverIds = ids.filter(id => typeof id === 'number');
      if (serverIds.length > 0) {
        try {
          await deleteMutation.mutateAsync(serverIds);
          // Force refresh of the counts data
          queryClient.invalidateQueries({ queryKey: ["/api/counts"] });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete some items. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const toggleSelection = (id: string | number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  if (!allCounts || allCounts.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No counts recorded yet
      </Card>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      <ScrollArea className="h-[300px] w-full rounded-md border">
        <div className="p-4 space-y-4">
          {allCounts.map((count) => (
            <Card key={count.id} className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {count.imageUrl ? (
                        <button
                          onClick={() => setSelectedImage(count.imageUrl)}
                          className="w-16 h-16 rounded-lg overflow-hidden border bg-muted hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={count.imageUrl}
                            alt={`${count.count} chickens`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {count.count} {count.count === 1 ? 'chicken' : 'chickens'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {count.timestamp
                            ? format(new Date(count.timestamp), 'MMM d, yyyy h:mm a')
                            : 'No date'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {count.userId === 0 ? (
                        <CloudOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Cloud className="h-4 w-4 text-blue-500" />
                      )}
                      <Checkbox
                        checked={selectedIds.has(count.id)}
                        onCheckedChange={() => toggleSelection(count.id)}
                        aria-label="Select item"
                      />
                    </div>
                  </div>

                {count.breed && (
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{count.breed}</span>
                    {count.confidence && (
                      <Badge variant="secondary" className="text-xs">
                        {count.confidence}% confidence
                      </Badge>
                    )}
                  </div>
                )}

                {count.labels && count.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {count.labels.map((label, index) => (
                      <Badge key={index} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <ImageModal
        imageUrl={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}