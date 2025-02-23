import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraUpload } from "@/components/camera-upload";
import { CountHistory } from "@/components/count-history";
import { ChickenLoader } from "@/components/chicken-loader";
import { TutorialModal } from "@/components/tutorial-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import type { Count } from "@shared/schema";
import { Loader2 } from "lucide-react";

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
  const store = useAppStore();

  const [processingCount, setProcessingCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  // Enhanced error handling and logging for the counts query
  const { data: countsData, isLoading: isLoadingCounts } = useQuery<CountsResponse>({
    queryKey: ["/api/counts"],
    queryFn: async () => {
      console.log('Fetching counts for user:', user?.id);
      const res = await apiRequest("GET", "/api/counts");
      if (!res.ok) {
        const error = await res.json();
        console.error('Failed to fetch counts:', error);
        throw new Error(error.error || 'Failed to fetch counts');
      }
      const data = await res.json();
      console.log(`Retrieved ${data.counts.length} counts for user ${user?.id}`);
      return data;
    },
    enabled: !!user, // Only fetch if user is logged in
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 3, // Retry failed requests 3 times
    onError: (error: Error) => {
      console.error('Error fetching counts:', error);
      toast({
        title: "Error",
        description: "Failed to load count history. Please try refreshing the page.",
        variant: "destructive",
      });
    },
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
          store.addCount(result.count);
        }
      });

      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/counts"] });

        // Show achievement notifications
        data.forEach(result => {
          if (result.newAchievements?.length) {
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

  // Early return while tutorial state is loading
  if (store.tutorialLoading) {
    return null;
  }

  // Get counts based on authentication status
  const counts = user ? countsData?.counts || [] : store.counts;

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-8">
      {store.showTutorial && (
        <TutorialModal
          isOpen={store.showTutorial}
          onClose={store.completeTutorial}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Flock Counter {!user && "(Guest Mode)"}
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

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {user && isLoadingCounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CountHistory counts={counts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}