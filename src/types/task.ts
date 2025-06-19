export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'work' | 'personal' | 'health' | 'learning' | 'other';
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  tags?: string[];
}

export interface ParsedTask {
  title: string;
  description?: string;
  priority: Task['priority'];
  category: Task['category'];
  dueDate?: Date;
  tags?: string[];
}