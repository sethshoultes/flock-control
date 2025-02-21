import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraUpload } from "@/components/camera-upload";
import { CountHistory } from "@/components/count-history";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: countsData } = useQuery({
    queryKey: ['/api/counts'],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (image: string) => {
      const response = await apiRequest('POST', '/api/analyze', { image });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
      toast({
        title: "Success",
        description: "Image analyzed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageCapture = (base64Image: string) => {
    analyzeMutation.mutate(base64Image);
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Chicken Counter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CameraUpload 
            onImageCapture={handleImageCapture}
            isLoading={analyzeMutation.isPending}
          />
        </CardContent>
      </Card>

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
