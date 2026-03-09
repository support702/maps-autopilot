import { motion } from "framer-motion";

interface SlideTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function SlideTransition({ children, className = "" }: SlideTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex h-full w-full flex-col items-center justify-center px-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}
