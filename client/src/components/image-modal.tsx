import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ imageUrl, isOpen, onClose }: ImageModalProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <div className="aspect-video relative overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt="Chicken count"
            className="w-full h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
