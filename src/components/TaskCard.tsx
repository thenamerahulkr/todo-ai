import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Check,
  AlertTriangle,
  Briefcase,
  User,
  Heart,
  BookOpen,
  HelpCircle,
  Tag,
  Flame
} from 'lucide-react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  index: number;
}

const priorityConfig = {
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: null },
  medium: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: null },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertTriangle },
  urgent: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Flame }
};

const categoryIcons = {
  work: Briefcase,
  personal: User,
  health: Heart,
  learning: BookOpen,
  other: HelpCircle
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
  index
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const CategoryIcon = categoryIcons[task.category];
  const priorityConf = priorityConfig[task.priority];
  const PriorityIcon = priorityConf.icon;

  const formatDueDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, h:mm a');
  };

  const isOverdue = task.dueDate && isPast(task.dueDate) && !task.completed;

  // Show menu button when hovered OR when dropdown is open
  const showMenuButton = isHovered || isDropdownOpen;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ 
        duration: 0.3,
        delay: index * 0.05,
        layout: { duration: 0.3 }
      }}
      className={cn(
        "group relative glass rounded-2xl p-6 hover-glow transition-all duration-300 cursor-pointer",
        task.completed && "opacity-50",
        isOverdue && "border-red-500/30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Priority indicator */}
      <div className={cn(
        "absolute top-0 left-6 w-16 h-1 rounded-b-full",
        priorityConf.bg.replace('/10', '/50')
      )} />

      <div className="flex items-start gap-4">
        <motion.div
          className="flex-shrink-0 mt-1"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => onToggleComplete(task.id)}
            className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </motion.div>

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className={cn(
                "font-semibold text-lg leading-tight mb-1",
                task.completed && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>
              
              {task.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>

            <AnimatePresence>
              {showMenuButton && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenu 
                    open={isDropdownOpen} 
                    onOpenChange={setIsDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDropdownOpen(!isDropdownOpen);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="glass border-border"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(task.id);
                          setIsDropdownOpen(false);
                        }} 
                        className="hover:bg-secondary cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(task.id);
                          setIsDropdownOpen(false);
                        }}
                        className="text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Category */}
            <div className="flex items-center gap-2">
              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground capitalize font-medium">
                {task.category}
              </span>
            </div>

            {/* Priority */}
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-medium border",
                priorityConf.bg,
                priorityConf.color,
                priorityConf.border
              )}
            >
              {PriorityIcon && <PriorityIcon className="w-3 h-3 mr-1" />}
              {task.priority}
            </Badge>

            {/* Due date */}
            {task.dueDate && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg",
                isOverdue 
                  ? "text-red-400 bg-red-500/10" 
                  : "text-muted-foreground bg-secondary/50"
              )}>
                {isOverdue ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                <span>{formatDueDate(task.dueDate)}</span>
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-muted-foreground" />
                {task.tags.slice(0, 2).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs px-2 py-0 bg-secondary/30">
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{task.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {task.completed && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-primary/5 rounded-2xl backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="bg-primary text-primary-foreground rounded-full p-3"
            >
              <Check className="h-6 w-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};