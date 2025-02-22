import { motion } from "framer-motion";

export function ChickenLoader() {
  return (
    <div className="flex flex-col items-center justify-center p-4 gap-2">
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        initial="start"
        animate="animate"
        className="text-orange-500"
      >
        {/* Body */}
        <motion.circle
          cx="60"
          cy="65"
          r="30"
          fill="currentColor"
          variants={{
            start: { scale: 1 },
            animate: {
              scale: [1, 1.1, 1],
              transition: {
                duration: 1,
                repeat: Infinity,
              },
            },
          }}
        />
        
        {/* Head */}
        <motion.circle
          cx="60"
          cy="40"
          r="20"
          fill="currentColor"
          variants={{
            start: { rotate: 0 },
            animate: {
              rotate: [-10, 10, -10],
              transition: {
                duration: 1,
                repeat: Infinity,
              },
            },
          }}
        />
        
        {/* Comb */}
        <motion.path
          d="M55 25 L60 20 L65 25 L70 20 L65 25 L60 20"
          stroke="red"
          strokeWidth="3"
          fill="none"
          variants={{
            start: { y: 0 },
            animate: {
              y: [-2, 2, -2],
              transition: {
                duration: 0.5,
                repeat: Infinity,
              },
            },
          }}
        />
        
        {/* Beak */}
        <motion.path
          d="M57 42 L63 42 L60 48 Z"
          fill="#fbbf24"
          variants={{
            start: { rotate: 0 },
            animate: {
              rotate: [-5, 5, -5],
              transition: {
                duration: 0.5,
                repeat: Infinity,
              },
            },
          }}
        />
        
        {/* Feet */}
        <motion.g
          variants={{
            start: { y: 0 },
            animate: {
              y: [-3, 3, -3],
              transition: {
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse",
              },
            },
          }}
        >
          <path
            d="M45 95 L55 85 L65 95"
            stroke="#fbbf24"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M55 95 L65 85 L75 95"
            stroke="#fbbf24"
            strokeWidth="3"
            fill="none"
          />
        </motion.g>
      </motion.svg>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Processing...
      </p>
    </div>
  );
}
