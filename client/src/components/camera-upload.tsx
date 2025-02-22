import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraUploadProps {
  onImageCapture: (base64Image: string) => void;
  isLoading: boolean;
}

export function CameraUpload({ onImageCapture, isLoading }: CameraUploadProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Handle camera initialization after video element exists
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        if (!videoRef.current) {
          throw new Error("Video element not ready");
        }

        console.log("Requesting camera access...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log("Camera initialized successfully!");
      } catch (error) {
        console.error("Camera initialization failed:", error);
        setIsCapturing(false);
        toast({
          title: "Camera Error",
          description: String(error),
          variant: "destructive"
        });
      }
    }

    if (isCapturing) {
      initCamera();
    }

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCapturing, toast]);

  const startCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Error",
        description: "Camera access is not supported in your browser",
        variant: "destructive"
      });
      return;
    }
    setIsCapturing(true);
  };

  const capture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');

    setIsCapturing(false);
    onImageCapture(imageData);
  };

  return (
    <div className="relative min-h-[400px] bg-black rounded-lg overflow-hidden">
      {isCapturing ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <Button
              onClick={capture}
              disabled={isLoading}
              variant="default"
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              <Camera className="h-6 w-6 mr-2" />
              Take Photo
            </Button>
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center">
          <Button
            onClick={startCamera}
            disabled={isLoading}
            variant="default"
            size="lg"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
          >
            <Camera className="h-6 w-6 mr-2" />
            Start Camera
          </Button>
        </div>
      )}
    </div>
  );
}