import { ParsedTask } from '@/types/task';
import { AITaskParser } from '@/services/aiTaskParser';

export class TaskParser {
  static async parse(input: string): Promise<ParsedTask> {
    return AITaskParser.parse(input);
  }
}