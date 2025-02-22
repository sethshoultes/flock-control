import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraUpload } from "@/components/camera-upload";
import { CountHistory } from "@/components/count-history";
import { PendingUploads } from "@/components/pending-uploads";
import { ChickenLoader } from "@/components/chicken-loader";
import { TutorialModal } from "@/components/tutorial-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCountStore } from "@/lib/store";
import { useTutorial } from "@/hooks/use-tutorial";
import { useAuth } from "@/hooks/use-auth";
import type { Count } from "@shared/schema";

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
  const { isOnline, addCount, queueForUpload } = useCountStore();
  const { showTutorial, completeTutorial, isLoading: tutorialLoading } = useTutorial();
  const [processingCount, setProcessingCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  // Add debugging logs
  console.log('Auth state:', { user, isOnline });
  console.log('Tutorial state:', { showTutorial, tutorialLoading });

  const { data: countsData, isError: countsError } = useQuery<CountsResponse>({
    queryKey: ["/api/counts"],
    queryFn: async () => {
      console.log('Fetching counts...');
      const res = await apiRequest("GET", "/api/counts");
      const data = await res.json();
      console.log('Counts data:', data);
      return data;
    },
    enabled: !!user // Only fetch if user is logged in
  });

  // Log any errors
  if (countsError) {
    console.error('Error fetching counts:', countsError);
  }

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
            const response = await apiRequest("POST", "/api/analyze", { image });
            const responseData = await response.json();
            setProcessingCount(prev => prev + 1);
            return responseData;
          } catch (error) {
            console.error('Analysis error:', error);
            throw error;
          }
        })
      );

      return results;
    },
    onSuccess: (data) => {
      data.forEach(result => {
        if (result.count) {
          addCount(result.count);
        }
      });

      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/counts"] });

        // Show achievement notifications
        data.forEach(result => {
          if (result.newAchievements && result.newAchievements.length > 0) {
            result.newAchievements.forEach(achievement => {
              toast({
                title: "Achievement Unlocked! 🏆",
                description: `${achievement.name} - ${achievement.description}`,
              });
            });
          }
        });
      }

      const totalChickens = data.reduce((sum, result) => sum + (result.count?.count || 0), 0);

      toast({
        title: user ? "Success" : "Guest Mode",
        description: `Analyzed ${data.length} images. Found ${totalChickens} chickens in total.`,
      });

      setProcessingCount(0);
      setTotalImages(0);
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setProcessingCount(0);
      setTotalImages(0);
    },
  });

  const handleImageCapture = (base64Images: string[]) => {
    analyzeMutation.mutate(base64Images);
  };

  if (tutorialLoading) {
    console.log('Tutorial is loading...');
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-8">
      {showTutorial && (
        <TutorialModal
          isOpen={showTutorial}
          onClose={completeTutorial}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Flock Counter {!user ? "(Guest Mode)" : (!isOnline ? "(Offline)" : "")}
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
            <CameraUpload
              onImageCapture={handleImageCapture}
              isLoading={analyzeMutation.isPending}
            />
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