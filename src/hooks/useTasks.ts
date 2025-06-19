import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types/task';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Convert database task to Task type
  const mapDbTaskToTask = (dbTask: any): Task => ({
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || undefined,
    priority: dbTask.priority as Task['priority'],
    category: dbTask.category as Task['category'],
    dueDate: dbTask.due_date ? new Date(dbTask.due_date) : undefined,
    completed: dbTask.completed,
    createdAt: new Date(dbTask.created_at),
    tags: dbTask.tags || undefined,
  });

  // Load tasks from Supabase
  const loadTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('Loading tasks for user:', user.id);
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load tasks:', error);
        toast.error('Failed to load tasks', {
          description: error.message || 'Please refresh the page to try again',
        });
        return;
      }

      console.log('Loaded tasks:', data?.length || 0);
      const mappedTasks = data?.map(mapDbTaskToTask) || [];
      setTasks(mappedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks', {
        description: 'Please refresh the page to try again',
      });
    }
  }, [user]);

  // Load tasks when user changes
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error('Authentication required', {
        description: 'Please log in to add tasks',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Adding task for user:', user.id);
      console.log('Task data:', taskData);

      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        toast.error('Database not configured', {
          description: 'Please set up your Supabase project and update the environment variables',
          duration: 5000,
        });
        return;
      }

      const insertData = {
        user_id: user.id,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority,
        category: taskData.category,
        due_date: taskData.dueDate?.toISOString() || null,
        completed: taskData.completed,
        tags: taskData.tags || null,
      };

      console.log('Inserting data:', insertData);

      const { data, error } = await supabase
        .from('tasks')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        
        // Provide more specific error messages
        if (error.code === 'PGRST116') {
          toast.error('Database table not found', {
            description: 'The tasks table may not exist. Please check your database setup.',
            duration: 5000,
          });
        } else if (error.code === '42501') {
          toast.error('Permission denied', {
            description: 'You may not have permission to add tasks. Please check your database policies.',
            duration: 5000,
          });
        } else if (error.message.includes('JWT')) {
          toast.error('Authentication error', {
            description: 'Please log out and log back in.',
            duration: 4000,
          });
        } else {
          toast.error('Failed to add task', {
            description: error.message || 'Please try again',
            duration: 4000,
          });
        }
        return;
      }

      if (!data) {
        toast.error('No data returned', {
          description: 'Task may not have been created properly',
        });
        return;
      }

      console.log('Task created successfully:', data);
      const newTask = mapDbTaskToTask(data);
      setTasks(prev => [newTask, ...prev]);
      
      toast.success("Task added successfully! ✨", {
        description: `"${newTask.title}" has been added to your list`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Failed to add task:', error);
      
      if (error.message?.includes('fetch')) {
        toast.error('Connection error', {
          description: 'Unable to connect to the database. Please check your internet connection.',
          duration: 4000,
        });
      } else {
        toast.error("Failed to add task", {
          description: error.message || "Please try again",
          duration: 3000
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!user) return;
    
    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate?.toISOString() || null;
      if (updates.completed !== undefined) updateData.completed = updates.completed;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update task:', error);
        toast.error("Failed to update task", {
          description: error.message || "Please try again",
          duration: 2000
        });
        return;
      }

      const updatedTask = mapDbTaskToTask(data);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));
    } catch (error: any) {
      console.error('Failed to update task:', error);
      toast.error("Failed to update task", {
        description: error.message || "Please try again",
        duration: 2000
      });
    }
  }, [user]);

  const toggleTaskComplete = useCallback(async (taskId: string) => {
    if (!user) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newCompleted = !task.completed;
    
    try {
      await updateTask(taskId, { completed: newCompleted });
      
      if (newCompleted) {
        toast.success("Task completed! 🎉", {
          description: `"${task.title}" has been marked as done`,
          duration: 2000
        });
      } else {
        toast.info("Task reopened", {
          description: `"${task.title}" has been marked as pending`,
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }, [tasks, updateTask, user]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) return;
    
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!taskToDelete) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to delete task:', error);
        toast.error("Failed to delete task", {
          description: error.message || "Please try again",
          duration: 2000
        });
        return;
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      toast.success("Task deleted", {
        description: `"${taskToDelete.title}" has been removed`,
        duration: 2000
      });
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      toast.error("Failed to delete task", {
        description: error.message || "Please try again",
        duration: 2000
      });
    }
  }, [tasks, user]);

  const editTask = useCallback((taskId: string) => {
    toast.info("Edit functionality", {
      description: "Task editing will be available in the next update",
      duration: 2000
    });
  }, []);

  return {
    tasks,
    isLoading,
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    editTask,
    refreshTasks: loadTasks
  };
};