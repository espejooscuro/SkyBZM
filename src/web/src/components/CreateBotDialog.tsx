import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.createBot(username.trim(), ''); // Empty password since we use Microsoft auth
      
      if (result.success) {
        setOpen(false);
        setUsername('');
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
              Minecraft Username / Email
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="h-10 rounded-xl"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              You'll authenticate via Microsoft after starting the bot
            </p>
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
              disabled={loading || !username.trim()}
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
          <p className="font-semibold mb-1">📌 How it works:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Create the bot with just your username/email</li>
            <li>Start the bot and it will show a Microsoft login link</li>
            <li>Visit the link and enter the code to authenticate</li>
            <li>The bot will connect automatically after authentication</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

