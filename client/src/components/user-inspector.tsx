import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "./ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Count } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface UserData {
  counts: Count[];
}

export function UserInspector() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<UserData>({
    queryKey: ["/api/counts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/counts");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch user data");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error instanceof Error) {
    return <p className="text-sm text-red-500">{error.message}</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-2">User Details</h3>
        <dl className="space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <dt className="text-sm text-muted-foreground">ID:</dt>
            <dd className="text-sm">{user?.id}</dd>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <dt className="text-sm text-muted-foreground">Username:</dt>
            <dd className="text-sm">{user?.username}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-2">Count History</h3>
        {!data?.counts?.length ? (
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
  );
}