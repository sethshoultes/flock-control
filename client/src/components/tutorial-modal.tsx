import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TutorialStep {
  title: string;
  description: string;
  icon: JSX.Element;
}

const steps: TutorialStep[] = [
  {
    title: "Take a Photo",
    description: "Use your camera or upload an image of your chickens. Works best with clear, well-lit photos!",
    icon: (
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        className="text-orange-500"
      >
        {/* Cute chicken with camera */}
        <circle cx="60" cy="65" r="30" fill="currentColor" />
        <circle cx="60" cy="40" r="20" fill="currentColor" />
        <path d="M55 25 L60 20 L65 25 L70 20 L65 25 L60 20" stroke="red" strokeWidth="3" fill="none" />
        <path d="M57 42 L63 42 L60 48 Z" fill="#fbbf24" />
        <rect x="40" y="50" width="40" height="30" rx="5" fill="#666" />
        <circle cx="60" cy="65" r="8" fill="#888" />
        <circle cx="60" cy="65" r="6" fill="#444" />
      </motion.svg>
    ),
  },
  {
    title: "AI Analysis",
    description: "Our AI will count your chickens, identify breeds, assess health, and provide detailed insights.",
    icon: (
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        className="text-blue-500"
      >
        {/* Chicken with thought bubble and gears */}
        <circle cx="60" cy="65" r="30" fill="currentColor" />
        <circle cx="60" cy="40" r="20" fill="currentColor" />
        <path d="M55 25 L60 20 L65 25 L70 20 L65 25 L60 20" stroke="red" strokeWidth="3" fill="none" />
        <path d="M57 42 L63 42 L60 48 Z" fill="#fbbf24" />
        <path d="M80 30 Q90 25 95 30 Q100 35 95 40 Q90 45 85 40 Q80 35 80 30" fill="#ddd" />
        <circle cx="90" cy="35" r="3" fill="#666" />
        <circle cx="95" cy="32" r="2" fill="#666" />
      </motion.svg>
    ),
  },
  {
    title: "Works Offline",
    description: "No internet? No problem! Take photos offline and they'll sync when you're back online.",
    icon: (
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        className="text-green-500"
      >
        {/* Chicken with wifi symbol */}
        <circle cx="60" cy="65" r="30" fill="currentColor" />
        <circle cx="60" cy="40" r="20" fill="currentColor" />
        <path d="M55 25 L60 20 L65 25 L70 20 L65 25 L60 20" stroke="red" strokeWidth="3" fill="none" />
        <path d="M57 42 L63 42 L60 48 Z" fill="#fbbf24" />
        <path d="M45 95 L55 85 L65 95" stroke="#fbbf24" strokeWidth="3" fill="none" />
        <path d="M55 95 L65 85 L75 95" stroke="#fbbf24" strokeWidth="3" fill="none" />
        {/* Wifi Arcs */}
        <path d="M40 50 Q60 30 80 50" stroke="#666" strokeWidth="3" fill="none" />
        <path d="M45 55 Q60 40 75 55" stroke="#666" strokeWidth="3" fill="none" />
        <path d="M50 60 Q60 50 70 60" stroke="#666" strokeWidth="3" fill="none" />
      </motion.svg>
    ),
  },
];

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center gap-4"
            >
              {steps[currentStep].icon}
              <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
              <p className="text-muted-foreground">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentStep
                      ? "bg-primary"
                      : "bg-primary/20"
                  )}
                />
              ))}
            </div>

            <Button onClick={handleNext} className="w-full">
              {currentStep < steps.length - 1 ? "Next" : "Get Started"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
