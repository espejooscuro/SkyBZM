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

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      >
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1 rounded-2xl shadow-2xl">
          <div className="bg-card rounded-xl p-6 relative">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" viewBox="0 0 23 23" fill="currentColor">
                  <path d="M0 0h11v11H0z" />
                  <path d="M12 0h11v11H12z" />
                  <path d="M0 12h11v11H0z" />
                  <path d="M12 12h11v11H12z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display text-lg font-bold">Microsoft Authentication Required</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                    {formatTime(timeLeft)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  First time signing in as <span className="font-semibold text-foreground">{username}</span>. Please authenticate now:
                </p>

                <div className="space-y-3">
                  {/* Code Display */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Authentication Code</p>
                      <p className="font-mono text-2xl font-bold tracking-wider text-primary">{code}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyCode}
                      className="rounded-xl"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(link, '_blank')}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:opacity-90"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Microsoft Login
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Or visit manually: <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">{link}</a>
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / 900) * 100}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
