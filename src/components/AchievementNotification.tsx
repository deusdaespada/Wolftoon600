import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const rarityColors = {
  common: {
    bg: 'from-zinc-600 to-zinc-800',
    border: 'border-zinc-500',
    glow: 'shadow-zinc-500/50',
    text: 'text-zinc-300',
  },
  rare: {
    bg: 'from-blue-600 to-blue-800',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/50',
    text: 'text-blue-300',
  },
  epic: {
    bg: 'from-purple-600 to-purple-800',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/50',
    text: 'text-purple-300',
  },
  legendary: {
    bg: 'from-yellow-500 to-amber-700',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/50',
    text: 'text-yellow-300',
  },
};

const rarityLabels = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

export default function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      
      // Trigger confetti for epic and legendary achievements
      if (achievement.rarity === 'epic' || achievement.rarity === 'legendary') {
        const colors = achievement.rarity === 'legendary' 
          ? ['#fbbf24', '#f59e0b', '#d97706', '#ffffff']
          : ['#a855f7', '#9333ea', '#7c3aed', '#ffffff'];
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors,
        });

        // Second burst
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
          });
        }, 200);

        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
          });
        }, 400);
      } else {
        // Simple confetti for common and rare
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
        });
      }

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 500);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const colors = rarityColors[achievement.rarity];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div 
            className={cn(
              "relative p-1 rounded-2xl shadow-2xl",
              colors.glow,
              "bg-gradient-to-r",
              colors.bg
            )}
          >
            {/* Glow effect */}
            <div className={cn(
              "absolute inset-0 rounded-2xl blur-xl opacity-50",
              "bg-gradient-to-r",
              colors.bg
            )} />
            
            <div className="relative bg-card/95 backdrop-blur-xl rounded-xl p-6 min-w-[320px] max-w-[400px]">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 hover:bg-muted/50"
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 500);
                }}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Sparkles className={cn("h-5 w-5", colors.text)} />
                </motion.div>
                <span className={cn("font-semibold uppercase tracking-wide text-sm", colors.text)}>
                  Nova Conquista!
                </span>
              </div>

              {/* Achievement content */}
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: 'spring', damping: 10 }}
                  className={cn(
                    "text-5xl p-3 rounded-xl",
                    "bg-gradient-to-br",
                    colors.bg,
                    "shadow-lg",
                    colors.glow
                  )}
                >
                  {achievement.icon}
                </motion.div>

                <div className="flex-1">
                  <motion.h3
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="font-bold text-lg"
                  >
                    {achievement.name}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-muted-foreground"
                  >
                    {achievement.description}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className={cn(
                      "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold",
                      "bg-gradient-to-r",
                      colors.bg,
                      "text-white"
                    )}
                  >
                    <Award className="h-3 w-3" />
                    {rarityLabels[achievement.rarity]}
                  </motion.div>
                </div>
              </div>

              {/* Animated particles for legendary */}
              {achievement.rarity === 'legendary' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                      initial={{ 
                        x: '50%', 
                        y: '50%', 
                        opacity: 0 
                      }}
                      animate={{
                        x: `${Math.random() * 100}%`,
                        y: `${Math.random() * 100}%`,
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
