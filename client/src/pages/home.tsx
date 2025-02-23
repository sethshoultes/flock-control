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

  const { data: countsData, isLoading: isLoadingCounts } = useQuery<CountsResponse>({
    queryKey: ["/api/counts"],
    queryFn: async () => {
      try {
        console.log('Fetching counts for authenticated user');
        const res = await apiRequest("GET", "/api/counts");
        if (!res.ok) {
          throw new Error("Failed to fetch counts");
        }
        const data = await res.json();
        console.log(`Retrieved ${data.counts.length} counts`);
        return data;
      } catch (error) {
        console.error('Error fetching counts:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (images: string[]) => {
      setTotalImages(images.length);
      setProcessingCount(0);

      console.log(`Processing ${images.length} images ${user ? 'for authenticated user' : 'in guest mode'}`);
      const results = await Promise.all(
        images.map(async (image) => {
          try {
            const response = await apiRequest("POST", "/api/analyze", { image });
            if (!response.ok) {
              throw new Error("Failed to analyze image");
            }
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
      console.log('Analysis successful, processing results');
      data.forEach(result => {
        if (result.count) {
          if (!user) {
            store.addCount(result.count);
          }
        }
      });

      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/counts"] });

        data.forEach(result => {
          if (result.newAchievements?.length) {
            result.newAchievements.forEach(achievement => {
              toast({
                title: "🎉 Achievement Unlocked!",
                description: (
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-primary">{achievement.name}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                ),
                duration: 5000,
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
      console.error('Analysis mutation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze images",
        variant: "destructive",
      });
      setProcessingCount(0);
      setTotalImages(0);
    },
  });

  const handleImageCapture = (base64Images: string[]) => {
    analyzeMutation.mutate(base64Images);
  };

  if (store.tutorialLoading) {
    return null;
  }

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
          <CardTitle className="text-center text-3xl font-bold text-foreground">
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
          <CardTitle className="text-foreground">History</CardTitle>
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