import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/task';
import { 
  Save, 
  X, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  Flame,
  Briefcase,
  User,
  Heart,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['work', 'personal', 'health', 'learning', 'other']),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  tags: z.string().optional(),
});

type EditTaskFormData = z.infer<typeof editTaskSchema>;

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const priorityConfig = {
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: null, label: 'Low Priority' },
  medium: { color: 'text-green-400', bg: 'bg-green-500/10', icon: null, label: 'Medium Priority' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: AlertTriangle, label: 'High Priority' },
  urgent: { color: 'text-red-400', bg: 'bg-red-500/10', icon: Flame, label: 'Urgent' }
};

const categoryConfig = {
  work: { icon: Briefcase, label: 'Work', color: 'text-blue-400' },
  personal: { icon: User, label: 'Personal', color: 'text-green-400' },
  health: { icon: Heart, label: 'Health', color: 'text-red-400' },
  learning: { icon: BookOpen, label: 'Learning', color: 'text-purple-400' },
  other: { icon: HelpCircle, label: 'Other', color: 'text-gray-400' }
};

export const EditTaskDialog: React.FC<EditTaskDialogProps> = ({
  task,
  open,
  onOpenChange,
  onSave
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema),
  });

  const watchedPriority = watch('priority');
  const watchedCategory = watch('category');

  // Reset form when task changes
  useEffect(() => {
    if (task && open) {
      const dueDate = task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '';
      const dueTime = task.dueDate ? format(task.dueDate, 'HH:mm') : '';
      const tags = task.tags ? task.tags.join(', ') : '';

      reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        category: task.category,
        dueDate,
        dueTime,
        tags,
      });

      setTagInput(tags);
    }
  }, [task, open, reset]);

  const onSubmit = async (data: EditTaskFormData) => {
    if (!task) return;

    setIsLoading(true);
    try {
      const updates: Partial<Task> = {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        category: data.category,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };

      // Handle due date
      if (data.dueDate) {
        const dateTime = data.dueTime 
          ? `${data.dueDate}T${data.dueTime}:00`
          : `${data.dueDate}T17:00:00`; // Default to 5 PM
        updates.dueDate = new Date(dateTime);
      } else {
        updates.dueDate = undefined;
      }

      await onSave(task.id, updates);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setValue('tags', value);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold gradient-text">
            Edit Task
          </DialogTitle>
          <DialogDescription>
            Make changes to your task. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Task Title *
            </Label>
            <Input
              id="title"
              placeholder="Enter task title..."
              className="glass border-border/50 focus:border-primary"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Add more details about this task..."
              className="glass border-border/50 focus:border-primary min-h-[80px]"
              {...register('description')}
            />
          </div>

          {/* Priority and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select
                value={watchedPriority}
                onValueChange={(value) => setValue('priority', value as any)}
              >
                <SelectTrigger className="glass border-border/50 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-border">
                  {Object.entries(priorityConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="w-4 h-4" />}
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={watchedCategory}
                onValueChange={(value) => setValue('category', value as any)}
              >
                <SelectTrigger className="glass border-border/50 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-border">
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date and Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                className="glass border-border/50 focus:border-primary"
                {...register('dueDate')}
              />
            </div>

            {/* Due Time */}
            <div className="space-y-2">
              <Label htmlFor="dueTime" className="text-sm font-medium">
                Due Time
              </Label>
              <Input
                id="dueTime"
                type="time"
                className="glass border-border/50 focus:border-primary"
                {...register('dueTime')}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-medium flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </Label>
            <Input
              id="tags"
              placeholder="Enter tags separated by commas..."
              className="glass border-border/50 focus:border-primary"
              value={tagInput}
              onChange={(e) => handleTagInputChange(e.target.value)}
            />
            {tagInput && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tagInput.split(',').map((tag, index) => {
                  const trimmedTag = tag.trim();
                  if (!trimmedTag) return null;
                  return (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {trimmedTag}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="hover:bg-secondary"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};