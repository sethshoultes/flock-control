import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Count } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface UserData {
  user: {
    id: number;
    username: string;
    role: string;
    createdAt: string;
  };
  counts: Count[];
}

export function UserInspector() {
  const [userId, setUserId] = useState<string>("");
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useQuery<UserData>({
    queryKey: [`/api/admin/users/${userId}`],
    queryFn: async () => {
      if (!userId) throw new Error("Please enter a user ID");
      const res = await apiRequest("GET", `/api/admin/users/${userId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch user data");
      }
      return res.json();
    },
    enabled: false, // Don't fetch automatically
  });

  const handleInspect = () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please enter a user ID",
        variant: "destructive",
      });
      return;
    }
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Enter user ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-32"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleInspect}
          disabled={isLoading}
          className="bg-blue-100 hover:bg-blue-200"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Inspect User"
          )}
        </Button>
      </div>

      {error instanceof Error && (
        <p className="text-sm text-red-500">{error.message}</p>
      )}

      {data && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium mb-2">User Details</h3>
            <dl className="space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <dt className="text-sm text-muted-foreground">ID:</dt>
                <dd className="text-sm">{data.user.id}</dd>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <dt className="text-sm text-muted-foreground">Username:</dt>
                <dd className="text-sm">{data.user.username}</dd>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <dt className="text-sm text-muted-foreground">Role:</dt>
                <dd className="text-sm">{data.user.role}</dd>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <dt className="text-sm text-muted-foreground">Created:</dt>
                <dd className="text-sm">
                  {new Date(data.user.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium mb-2">Count History</h3>
            {data.counts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No counts found</p>
            ) : (
              <ul className="space-y-2">
                {data.counts.map((count) => (
                  <li key={count.id} className="text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p>Count: {count.count}</p>
                        <p className="text-muted-foreground">
                          {new Date(count.timestamp!).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p>Breed: {count.breed}</p>
                        <p className="text-muted-foreground">
                          Confidence: {count.confidence}%
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
