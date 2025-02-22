import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraUpload } from "@/components/camera-upload";
import { CountHistory } from "@/components/count-history";
import { PendingUploads } from "@/components/pending-uploads";
import { ChickenLoader } from "@/components/chicken-loader";
import { TutorialModal } from "@/components/tutorial-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCountStore } from "@/lib/store";
import { useTutorial } from "@/hooks/use-tutorial";
import { useAuth } from "@/hooks/use-auth";
import type { Count } from "@shared/schema";
import crypto from 'crypto';
import { WifiOff, Database } from "lucide-react";

interface CountsResponse {
  counts: Count[];
}

interface AnalyzeResponse {
  count: Count;
  newAchievements?: Array<{
    name: string;
    description: string;
  }>;
}

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { connection, addCount, queueForUpload, importCounts, setTestMode } = useCountStore();
  const { showTutorial, completeTutorial, isLoading: tutorialLoading } = useTutorial();
  const [processingCount, setProcessingCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const { data: countsData } = useQuery<CountsResponse>({
    queryKey: ["/api/counts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/counts");
      return res.json();
    },
    enabled: !!user && connection.isOnline && connection.isDatabaseConnected
  });

  const analyzeMutation = useMutation<
    Array<AnalyzeResponse>,
    Error,
    string[]
  >({
    mutationFn: async (images: string[]) => {
      setTotalImages(images.length);
      setProcessingCount(0);

      const results = await Promise.all(
        images.map(async (image) => {
          try {
            if (!user) {
              // Guest mode
              const response = await apiRequest("POST", "/api/analyze", { image });
              const responseData = await response.json();
              return {
                count: {
                  ...responseData.count,
                  id: crypto.randomUUID(),
                  userId: 0,
                  labels: [...(responseData.count.labels || []), "guest-mode"]
                },
                newAchievements: []
              };
            } else if (!connection.isOnline || !connection.isDatabaseConnected) {
              // Offline/Disconnected mode
              queueForUpload(image);
              throw new Error(connection.lastError ||
                (!connection.isOnline ? "You're offline. Images will be analyzed when you're back online." :
                  "Database is disconnected. Images will be analyzed when connection is restored."));
            } else {
              // Online & authenticated
              const response = await apiRequest("POST", "/api/analyze", { image });
              const responseData = await response.json();
              setProcessingCount(prev => prev + 1);
              return responseData;
            }
          } catch (error) {
            if (!user && error instanceof Error) {
              // Fallback for guest mode on error
              return {
                count: {
                  id: crypto.randomUUID(),
                  count: 0,
                  imageUrl: image,
                  timestamp: new Date(),
                  userId: 0,
                  breed: null,
                  confidence: null,
                  labels: ["guest-mode", "ai-failed"]
                } as Count,
                newAchievements: []
              };
            }
            throw error;
          }
        })
      );

      return results;
    },
    onSuccess: (data) => {
      // Import counts into local store
      data.forEach(result => {
        if (result.count) {
          addCount(result.count);
        }
      });

      if (user) {
        // Refresh queries for authenticated users
        queryClient.invalidateQueries({ queryKey: ["/api/counts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });

        // Show achievement notifications
        const achievementsEarned = data.filter(result => result.newAchievements?.length > 0);
        achievementsEarned.forEach(result => {
          result.newAchievements?.forEach(achievement => {
            toast({
              title: "Achievement Unlocked! 🏆",
              description: `${achievement.name} - ${achievement.description}`,
            });
          });
        });
      }

      // Calculate stats for toast message
      const totalChickens = data.reduce((sum, result) => sum + (result.count?.count || 0), 0);
      const failedAnalysis = data.some(result => result.count?.labels?.includes("ai-failed"));

      if (user) {
        toast({
          title: "Success",
          description: `Analyzed ${data.length} images. Found ${totalChickens} chickens in total.`,
        });
      } else {
        toast({
          title: "Guest Mode",
          description: failedAnalysis
            ? "Some images couldn't be analyzed. Try again or sign in for better results."
            : `Added ${data.length} images with ${totalChickens} chickens to local storage.`,
          variant: failedAnalysis ? "destructive" : "default"
        });
      }

      setProcessingCount(0);
      setTotalImages(0);
    },
    onError: (error) => {
      toast({
        title: !user ? "Guest Mode" : (!connection.isOnline ? "Offline Mode" : "Database Error"),
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: connection.isOnline ? "destructive" : "default",
      });
      setProcessingCount(0);
      setTotalImages(0);
    },
  });

  const handleImageCapture = (base64Images: string[]) => {
    analyzeMutation.mutate(base64Images);
  };

  const handleTestOffline = () => {
    setTestMode(!connection.isTestingOffline);
  };

  if (tutorialLoading) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-8">
      <TutorialModal
        isOpen={showTutorial}
        onClose={completeTutorial}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center justify-center gap-2">
            Flock Counter
            {!connection.isOnline ? (
              <div className="flex items-center gap-1 text-destructive" title={connection.isTestingOffline ? "Testing offline mode" : "You are offline"}>
                <WifiOff className="w-6 h-6" />
                <span className="text-sm font-normal">
                  ({connection.isTestingOffline ? "Test Mode" : "Offline"})
                </span>
              </div>
            ) : !connection.isDatabaseConnected ? (
              <div className="flex items-center gap-1 text-destructive" title={connection.lastError || "Database disconnected"}>
                <Database className="w-6 h-6" />
                <span className="text-sm font-normal">(DB Disconnected)</span>
              </div>
            ) : !user ? (
              <span className="text-sm font-normal">(Guest Mode)</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyzeMutation.isPending ? (
            <div className="space-y-2">
              <ChickenLoader />
              {totalImages > 1 && (
                <p className="text-center text-sm text-muted-foreground">
                  Processing image {processingCount + 1} of {totalImages}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <CameraUpload
                onImageCapture={handleImageCapture}
                isLoading={analyzeMutation.isPending}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestOffline}
                className="w-full"
              >
                {connection.isTestingOffline
                  ? "Exit Test Mode"
                  : "Test Offline Mode"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {user && <PendingUploads />}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <CountHistory counts={countsData?.counts || []} />
        </CardContent>
      </Card>
    </div>
  );
}
