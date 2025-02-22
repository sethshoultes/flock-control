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

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOnline, addCount, queueForUpload } = useCountStore();
  const { showTutorial, completeTutorial, isLoading: tutorialLoading } = useTutorial();

  const { data: countsData } = useQuery({
    queryKey: ["/api/counts"],
    enabled: isOnline,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (image: string) => {
      if (!isOnline) {
        queueForUpload(image);
        throw new Error(
          "You're offline. Image will be analyzed when you're back online.",
        );
      }
      const response = await apiRequest("POST", "/api/analyze", { image });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/counts"] });
      addCount(data.count);
      toast({
        title: "Success",
        description: "Image analyzed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: isOnline ? "Error" : "Offline Mode",
        description: error.message,
        variant: isOnline ? "destructive" : "default",
      });
    },
  });

  const handleImageCapture = (base64Image: string) => {
    analyzeMutation.mutate(base64Image);
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
            Flock Counter {!isOnline && "(Offline)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyzeMutation.isPending ? (
            <ChickenLoader />
          ) : (
            <CameraUpload
              onImageCapture={handleImageCapture}
              isLoading={analyzeMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      <PendingUploads />

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