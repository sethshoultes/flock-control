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
import crypto from 'crypto';

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline, addCount, queueForUpload, importCounts } = useCountStore();
  const { showTutorial, completeTutorial, isLoading: tutorialLoading } = useTutorial();
  const [processingCount, setProcessingCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  // Only fetch cloud data if user is authenticated
  const { data: countsData } = useQuery({
    queryKey: ["/api/counts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/counts");
      return res.json();
    },
    enabled: !!user && isOnline,
    onSuccess: (data) => {
      if (data?.counts) {
        importCounts(data.counts);
      }
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (images: string[]) => {
      setTotalImages(images.length);
      setProcessingCount(0);

      // Process images with AI regardless of login status
      const results = await Promise.all(
        images.map(async (image, index) => {
          try {
            let count: Count;

            if (!user) {
              // Guest mode - process locally but still use AI
              const response = await apiRequest("POST", "/api/analyze", { image });
              const data = await response.json();
              count = {
                ...data.count,
                id: crypto.randomUUID(),
                userId: 0, // Guest user
                labels: [...(data.count.labels || []), "guest-mode"]
              };
            } else if (!isOnline) {
              // Logged in but offline - queue for processing
              queueForUpload(image);
              throw new Error("You're offline. Images will be analyzed when you're back online.");
            } else {
              // Online & logged in - process normally
              const response = await apiRequest("POST", "/api/analyze", { image });
              const data = await response.json();
              count = data.count;
            }

            setProcessingCount(prev => prev + 1);
            return { count };
          } catch (error) {
            if (!user && error instanceof Error) {
              // For guest mode, create a basic count if AI fails
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
                } as Count
              };
            }
            throw error;
          }
        })
      );

      return results;
    },
    onSuccess: (data) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/counts"] });
      }
      data.forEach(result => addCount(result.count));

      const totalChickens = data.reduce((sum, result) => sum + result.count.count, 0);
      const failedAnalysis = data.some(result => result.count.labels?.includes("ai-failed"));

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
        title: !user ? "Guest Mode" : (isOnline ? "Error" : "Offline Mode"),
        description: error.message,
        variant: isOnline ? "destructive" : "default",
      });
      setProcessingCount(0);
      setTotalImages(0);
    },
  });

  const handleImageCapture = (base64Images: string[]) => {
    analyzeMutation.mutate(base64Images);
  };

  // Show nothing while tutorial state is loading to prevent flashing
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

      {/* Only show pending uploads for logged-in users */}
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