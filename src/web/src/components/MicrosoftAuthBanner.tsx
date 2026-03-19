import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MicrosoftAuthBannerProps {
  username: string;
  code: string;
  link: string;
  onDismiss?: () => void;
}

export default function MicrosoftAuthBanner({ username, code, link, onDismiss }: MicrosoftAuthBannerProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
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
  }, []);

  const copyCode = () => {
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 23 23" fill="currentColor">
                      <path d="M0 0h11v11H0z" />
                      <path d="M12 0h11v11H12z" />
                      <path d="M0 12h11v11H0z" />
                      <path d="M12 12h11v11H12z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold">Authentication Required</h3>
                    <p className="text-xs text-muted-foreground">For {username}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-lg hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Timer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Time remaining</span>
                <span className="font-mono text-primary font-bold">{formatTime(timeLeft)}</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 900) * 100}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                />
              </div>

              {/* Code Display */}
              <div className="relative">
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Authentication Code</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="font-mono text-3xl font-bold tracking-widest bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      {code}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={copyCode}
                      className="h-8 w-8 rounded-lg hover:bg-muted"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => window.open(link, '_blank')}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white border-0 hover:opacity-90 shadow-lg h-11 font-display"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Microsoft Login
              </Button>

              {/* Help text */}
              <p className="text-xs text-center text-muted-foreground">
                Click the button above or manually visit{' '}
                <span className="text-primary font-mono">microsoft.com/link</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
