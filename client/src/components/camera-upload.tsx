import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraUploadProps {
  onImageCapture: (base64Image: string) => void;
  isLoading: boolean;
}

export function CameraUpload({ onImageCapture, isLoading }: CameraUploadProps) {
  const [isCapturing, setIsCapturing] = useState(false);
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
    console.log('Starting camera initialization...');

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('getUserMedia not supported');
      toast({
        title: "Browser Error",
        description: "Camera API is not supported in this browser",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      console.log('Camera access granted');

      if (!videoRef.current) {
        console.error('Video element not found');
        return;
      }

      videoRef.current.srcObject = mediaStream;
      console.log('Set video source');

      // Create a promise that resolves when the video can play
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) return reject('No video element');

        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          if (!videoRef.current) return reject('No video element after metadata load');

          videoRef.current.onloadeddata = () => {
            console.log('Video data loaded, starting playback');
            videoRef.current?.play()
              .then(() => {
                console.log('Video playback started');
                resolve();
              })
              .catch(error => {
                console.error('Video playback failed:', error);
                reject(error);
              });
          };
        };

        // Add timeout
        setTimeout(() => reject('Video initialization timed out'), 10000);
      });

      setStream(mediaStream);
      setIsCapturing(true);
      console.log('Camera setup complete');

    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    stopCamera();
    onImageCapture(base64Image);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        onImageCapture(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-[400px] bg-black rounded-lg overflow-hidden">
      {isCapturing ? (
        <div className="relative h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button onClick={captureImage} disabled={isLoading}>
              <Camera className="h-5 w-5 mr-2" />
              Take Photo
            </Button>
            <Button variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
          <Button onClick={startCamera} disabled={isLoading} size="lg">
            <Camera className="h-5 w-5 mr-2" />
            Open Camera
          </Button>

          <div className="w-full max-w-sm">
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
              variant="outline"
              size="lg"
            >
              <label htmlFor="image-upload" className="flex items-center justify-center cursor-pointer">
                <Upload className="h-5 w-5 mr-2" />
                Upload Image
              </label>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}