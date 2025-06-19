import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  LayoutGrid, 
  List, 
  Filter, 
  ArrowUpDown,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, isTomorrow, isPast, compareAsc } from 'date-fns';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

type FilterType = 'all' | 'pending' | 'completed' | 'overdue' | 'today' | 'upcoming';
type SortType = 'dueDate' | 'priority' | 'created' | 'alphabetical';
type ViewType = 'grid' | 'list';

const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };

const filterTabs = [
  { id: 'all', label: 'All', icon: Circle },
  { id: 'pending', label: 'Active', icon: Clock },
  { id: 'completed', label: 'Done', icon: CheckCircle2 },
  { id: 'overdue', label: 'Overdue', icon: AlertTriangle },
];

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onDelete,
  onEdit
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('dueDate');
  const [viewType, setViewType] = useState<ViewType>('grid');

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    switch (filter) {
      case 'pending':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'overdue':
        filtered = filtered.filter(task => 
          task.dueDate && isPast(task.dueDate) && !task.completed
        );
        break;
      case 'today':
        filtered = filtered.filter(task => 
          task.dueDate && isToday(task.dueDate)
        );
        break;
      case 'upcoming':
        filtered = filtered.filter(task => 
          task.dueDate && !isPast(task.dueDate) && !isToday(task.dueDate)
        );
        break;
    }

    switch (sortBy) {
      case 'dueDate':
        filtered.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return compareAsc(a.dueDate, b.dueDate);
        });
        break;
      case 'priority':
        filtered.sort((a, b) => 
          priorityOrder[b.priority] - priorityOrder[a.priority]
        );
        break;
      case 'created':
        filtered.sort((a, b) => 
          compareAsc(b.createdAt, a.createdAt)
        );
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [tasks, filter, sortBy]);

  const taskCounts = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
    overdue: tasks.filter(t => t.dueDate && isPast(t.dueDate) && !t.completed).length,
  }), [tasks]);

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-3xl bg-secondary/30 flex items-center justify-center mx-auto">
            <Circle className="h-12 w-12 text-muted-foreground" />
          </div>
        </motion.div>
        <h3 className="text-2xl font-semibold text-foreground mb-3">
          Ready to get productive?
        </h3>
        <p className="text-muted-foreground text-lg">
          Add your first task above to get started
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const count = taskCounts[tab.id as keyof typeof taskCounts];
            const isActive = filter === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => setFilter(tab.id as FilterType)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <Badge 
                    variant={isActive ? "secondary" : "outline"} 
                    className={cn(
                      "h-5 min-w-5 text-xs",
                      isActive && "bg-primary-foreground/20 text-primary-foreground"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Sort and view controls */}
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
            <SelectTrigger className="w-40 glass border-border">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-border">
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-xl border border-border overflow-hidden">
            <Button
              variant={viewType === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('grid')}
              className="rounded-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('list')}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Task Grid */}
      <AnimatePresence mode="wait">
        {filteredAndSortedTasks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary/30 flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">No tasks match your current filter</p>
          </motion.div>
        ) : (
          <motion.div
            key="tasks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "grid gap-6",
              viewType === 'grid' 
                ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
                : "grid-cols-1"
            )}
          >
            <AnimatePresence>
              {filteredAndSortedTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};