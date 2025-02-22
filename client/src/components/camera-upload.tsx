import { useState, useRef } from "react";
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

  const startCamera = async () => {
    console.log("Starting camera...");

    try {
      // First, check if the browser supports getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Your browser doesn't support camera access");
      }

      // Request camera access
      console.log("Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      console.log("Camera permission granted!");

      // Set up video element
      if (videoRef.current) {
        console.log("Setting up video preview...");
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCapturing(true);
        console.log("Camera should be visible now!");
      } else {
        console.error("Video element not found!");
        throw new Error("Could not find video preview element");
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };

  const capture = () => {
    if (!videoRef.current) {
      console.error("No video element found for capture");
      return;
    }

    console.log("Capturing image...");

    // Create a canvas element to capture the current video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      console.error("Could not get canvas context");
      return;
    }

    // Draw the current video frame to the canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg');
    console.log("Image captured successfully!");

    // Stop the camera
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    setIsCapturing(false);

    // Send the image data to parent
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
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button 
              onClick={capture}
              disabled={isLoading}
              size="lg"
              className="bg-green-500 hover:bg-green-600"
            >
              <Camera className="h-5 w-5 mr-2" />
              Take Photo
            </Button>
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center">
          <Button
            onClick={startCamera}
            disabled={isLoading}
            size="lg"
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Camera className="h-5 w-5 mr-2" />
            Start Camera
          </Button>
        </div>
      )}
    </div>
  );
}