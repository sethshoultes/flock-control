import { useState, useRef, useEffect } from "react";
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
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setIsCameraLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      // Verify we got video tracks
      if (mediaStream.getVideoTracks().length === 0) {
        throw new Error("No video track available");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });

        setStream(mediaStream);
        setIsCapturing(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions or try a different device.",
        variant: "destructive"
      });
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        onImageCapture(base64Image);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 50MB",
          variant: "destructive"
        });
        return;
      }

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
          <div className="relative aspect-video w-full max-w-xl mx-auto overflow-hidden rounded-lg border bg-muted">
            {stream && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={captureImage}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              Capture Photo
            </Button>
            <Button
              variant="outline"
              onClick={stopCamera}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button 
            onClick={startCamera}
            className="w-full"
            disabled={isLoading || isCameraLoading}
          >
            {isCameraLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {isCameraLoading ? "Starting Camera..." : "Open Camera"}
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