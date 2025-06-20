import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Mic, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskInputProps {
  onAddTask: (input: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, isLoading = false, className }) => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isProcessing) {
      setIsProcessing(true);
      console.log('TaskInput: Starting to process task:', input);
      
      try {
        await onAddTask(input);
        console.log('TaskInput: Task processing completed successfully');
        setInput('');
      } catch (error) {
        console.error('TaskInput: Error processing task:', error);
      } finally {
        console.log('TaskInput: Resetting processing state');
        setIsProcessing(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isLoading && !isProcessing) {
      handleSubmit(e);
    }
  };

  const isCurrentlyLoading = isLoading || isProcessing;

  const suggestions = [
    "Review presentation by 3 PM urgent",
    "Call mom tonight #personal",
    "Gym workout tomorrow morning",
    "Finish project report by Friday"
  ];

  return (
    <motion.div
      className={cn("relative w-full max-w-4xl mx-auto", className)}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <motion.div
        className={cn(
          "relative glass rounded-3xl transition-all duration-500",
          isFocused && "glow scale-[1.02]"
        )}
        layout
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ 
                rotate: isFocused ? 180 : 0,
                scale: isCurrentlyLoading ? [1, 1.1, 1] : 1
              }}
              transition={{ 
                duration: 0.3,
                scale: { duration: 1, repeat: isCurrentlyLoading ? Infinity : 0 }
              }}
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
            >
              {isCurrentlyLoading ? (
                <Brain className="w-5 h-5 text-primary" />
              ) : (
                <Sparkles className="w-5 h-5 text-primary" />
              )}
            </motion.div>
            <div>
              <h3 className="font-semibold text-foreground">
                {isCurrentlyLoading ? "AI is thinking..." : "What's on your mind?"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isCurrentlyLoading ? "Processing your task with AI" : "Describe your task naturally"}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 'Finish project report by 6 PM tomorrow urgent #work'"
              disabled={isCurrentlyLoading}
              className="w-full h-24 bg-transparent border-0 text-lg placeholder:text-muted-foreground/50 focus:outline-none resize-none disabled:opacity-50"
            />
            
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {/* <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isCurrentlyLoading}
                className="w-9 h-9 p-0 rounded-xl hover:bg-primary/10"
              >
                <Mic className="w-4 h-4" />
              </Button> */}
              
              <Button
                type="submit"
                disabled={!input.trim() || isCurrentlyLoading}
                size="sm"
                className="w-9 h-9 p-0 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                <motion.div
                  whileHover={{ scale: isCurrentlyLoading ? 1 : 1.1 }}
                  whileTap={{ scale: isCurrentlyLoading ? 1 : 0.9 }}
                >
                  {isCurrentlyLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.div>
              </Button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Quick suggestions */}
      <AnimatePresence>
        {!isFocused && input === '' && !isCurrentlyLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6"
          >
            <p className="text-sm text-muted-foreground mb-3 text-center">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 text-sm bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full transition-all duration-200 hover-glow"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Status */}
      <AnimatePresence>
        {isCurrentlyLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI is parsing your task...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut */}
      <motion.div
        className="mt-4 text-center text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Press <kbd className="px-2 py-1 bg-secondary rounded text-xs">⌘ Enter</kbd> to add task
      </motion.div>
    </motion.div>
  );
};