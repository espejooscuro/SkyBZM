import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MicrosoftAuthBannerProps {
  username: string;
  code: string;
  link: string;
  logs: string[];
  onDismiss?: () => void;
}

export default function MicrosoftAuthBanner({ username, code, link, logs, onDismiss }: MicrosoftAuthBannerProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check for successful sign-in
  useEffect(() => {
    const hasSignedIn = logs.some(log => {
      const message = typeof log === 'string' ? log : log?.message || '';
      return message.includes('[msa] Signed in with Microsoft');
    });
    if (hasSignedIn && !isSuccess) {
      setIsSuccess(true);
      toast.success('Successfully signed in with Microsoft!');
      // Auto-dismiss after showing success animation
      setTimeout(() => {
        handleDismiss();
      }, 2000);
    }
  }, [logs, isSuccess]);

  useEffect(() => {
    if (isSuccess) return; // Stop timer on success
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          drag={!isSuccess}
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={{
            top: -window.innerHeight / 2 + 100,
            bottom: window.innerHeight / 2 - 100,
            left: -window.innerWidth / 2 + 200,
            right: window.innerWidth / 2 - 200,
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0, scale: isSuccess ? 1.05 : 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 cursor-move"
        >
          <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
            {/* Success overlay */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <div className="bg-white/20 rounded-full p-6">
                      <Check className="w-16 h-16 text-white" strokeWidth={3} />
                    </div>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="absolute bottom-8 text-white text-lg font-semibold"
                  >
                    Successfully Authenticated!
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
              {/* Close button */}
              {!isSuccess && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}

              {/* Drag handle indicator */}
              {!isSuccess && (
                <div className="flex justify-center pt-2 pb-1">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                {/* Timer */}
                {!isSuccess && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Time remaining</span>
                    <span className="font-mono text-primary font-bold">{formatTime(timeLeft)}</span>
                  </div>
                )}

                {/* Progress bar */}
                {!isSuccess && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / 900) * 100}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                    />
                  </div>
                )}

                {/* Content */}
                {!isSuccess && (
                  <div className="p-6 pt-2">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          Authentication Required
                        </h3>
                        <p className="text-sm text-white/80">
                          <strong>{username}</strong> needs Microsoft authentication
                        </p>
                      </div>
                    </div>

                    {/* Code display */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                          Access Code
                        </span>
                        <button
                          onClick={handleCopy}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-300" />
                          ) : (
                            <Copy className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                      </div>
                      <div className="text-center">
                        <code className="text-2xl font-bold text-white tracking-wider font-mono select-all">
                          {code}
                        </code>
                      </div>
                    </div>

                    {/* Action button */}
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseDown={(e) => e.stopPropagation()}
                      className="block"
                    >
                      <Button
                        className="w-full bg-white hover:bg-white/90 text-purple-600 font-semibold py-3 rounded-lg transition-all hover:scale-105 cursor-pointer"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Microsoft Login
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

