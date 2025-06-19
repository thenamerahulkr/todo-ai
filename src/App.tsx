import React from 'react';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { TaskParser } from './utils/taskParser';
import { Header } from './components/Header';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { Stats } from './components/Stats';
import { Toaster } from './components/ui/sonner';
import { useTasks } from './hooks/useTasks';

const AppContent: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const {
    tasks,
    isLoading: tasksLoading,
    addTask,
    toggleTaskComplete,
    deleteTask,
    editTask
  } = useTasks();

  const handleAddTask = async (input: string): Promise<void> => {
    console.log('App: Starting task parsing for:', input);
    
    try {
      const parsedTask = await TaskParser.parse(input);
      console.log('App: Task parsed successfully:', parsedTask);
      
      await addTask({
        ...parsedTask,
        completed: false
      });
      console.log('App: Task added successfully');
    } catch (error) {
      console.error('App: Failed to parse or add task:', error);
      throw error; // Re-throw so TaskInput can handle the error state
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/3 to-blue-500/3 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: [360, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-purple-500/3 to-primary/3 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <Header />
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-12"
          >
            <TaskInput onAddTask={handleAddTask} isLoading={tasksLoading} />
            <Stats tasks={tasks} />
            <TaskList
              tasks={tasks}
              onToggleComplete={toggleTaskComplete}
              onDelete={deleteTask}
              onEdit={editTask}
            />
          </motion.div>
        </div>
      </div>

      <Toaster 
        position="top-right" 
        richColors 
        theme="dark"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;