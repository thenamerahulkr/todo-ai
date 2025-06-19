import React from 'react';
import { motion } from 'framer-motion';
import { Task } from '@/types/task';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Target,
} from 'lucide-react';
import { isToday, isPast } from 'date-fns';
interface StatsProps {
  tasks: Task[];
}

export const Stats: React.FC<StatsProps> = ({ tasks }) => {
  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(t => t.dueDate && isPast(t.dueDate) && !t.completed).length;
    const dueToday = tasks.filter(t => t.dueDate && isToday(t.dueDate) && !t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      overdue,
      dueToday,
      completionRate
    };
  }, [tasks]);

  const statCards = [
    {
      title: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      progress: stats.completionRate
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Active',
      value: stats.pending,
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    }
  ];

  if (stats.total === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
    >
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ y: -2, scale: 1.02 }}
            className="glass rounded-2xl p-6 hover-glow transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <motion.div
                className="text-3xl font-bold text-foreground"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1, type: "spring" }}
              >
                {stat.value}
              </motion.div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              
              {stat.progress !== undefined && (
                <div className="w-full bg-secondary/30 rounded-full h-2">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};