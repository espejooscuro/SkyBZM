import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as api from '@/lib/api';

interface CreateBotDialogProps {
  onBotCreated: () => void;
}

export default function CreateBotDialog({ onBotCreated }: CreateBotDialogProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.createBot(username.trim(), password.trim());
      
      if (result.success) {
        setOpen(false);
        setUsername('');
        setPassword('');
        onBotCreated();
      } else {
        setError(result.message || 'Failed to create bot');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 pastel-gradient text-white border-0 hover:opacity-90">
          <Plus className="w-4 h-4" />
          Add Bot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create New Bot</DialogTitle>
          <DialogDescription>
            Add a new Minecraft account to your bazaar flipper fleet
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Minecraft Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="h-10 rounded-xl"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Minecraft Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-10 rounded-xl pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="flex-1 rounded-xl pastel-gradient text-white border-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bot
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">📌 Important:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Use a Microsoft account credentials</li>
            <li>2FA must be disabled on the account</li>
            <li>The bot will start in offline mode by default</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
