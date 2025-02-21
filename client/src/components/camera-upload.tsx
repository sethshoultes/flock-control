import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraUploadProps {
  onImageCapture: (base64Image: string) => void;
  isLoading: boolean;
}

export function CameraUpload({ onImageCapture, isLoading }: CameraUploadProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg');
      
      // Stop camera stream
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCapturing(false);
      
      onImageCapture(base64Image);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      {isCapturing ? (
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-xl mx-auto rounded-lg border"
          />
          <Button 
            onClick={captureImage}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            Capture Photo
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Button 
            onClick={startCamera}
            className="w-full"
            disabled={isLoading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Open Camera
          </Button>
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="hidden"
              id="image-upload"
            />
            <Button 
              asChild
              className="w-full"
              disabled={isLoading}
            >
              <label htmlFor="image-upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </label>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
