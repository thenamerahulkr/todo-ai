import OpenAI from 'openai';
import { ParsedTask } from '@/types/task';
import { addDays, setHours, setMinutes, parseISO, isValid, } from 'date-fns';

export class AITaskParser {
  private static openai: OpenAI | null = null;
  private static isInitialized = false;

  private static initialize() {
    if (this.isInitialized) return;
    
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    }
    this.isInitialized = true;
  }

  static async parse(input: string): Promise<ParsedTask> {
    console.log('AI Parser: Starting to parse input:', input);
    this.initialize();

    // If no API key, fall back to rule-based parsing
    if (!this.openai) {
      console.warn('OpenAI API key not found, using fallback parser');
      return this.fallbackParse(input);
    }

    try {
      console.log('AI Parser: Using OpenAI for parsing');
      
      const systemPrompt = `You are an AI task parser. Parse the user's natural language input into a structured task format.

Current date and time: ${new Date().toISOString()}
Current year: ${new Date().getFullYear()}

Return a JSON object with these exact fields:
{
  "title": "Clean, concise task title (required)",
  "description": "Additional details if provided (optional)",
  "priority": "low" | "medium" | "high" | "urgent",
  "category": "work" | "personal" | "health" | "learning" | "other",
  "dueDate": "ISO date string or null",
  "tags": ["array", "of", "tags"] or []
}

CRITICAL DATE PARSING RULES:
- Handle absolute dates: "25th June", "June 25", "25/6", "6/25", "2025-06-25"
- Handle relative dates: "today", "tomorrow", "next week", "Monday"
- Handle ordinal dates: "1st", "2nd", "3rd", "4th", "5th", etc.
- If year is not specified, assume current year (${new Date().getFullYear()})
- If no specific time given, default to 5 PM (17:00)
- Parse times: "6 PM", "3:30 AM", "noon", "midnight"
- Handle month names: January, February, March, April, May, June, July, August, September, October, November, December
- Handle abbreviated months: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec

Examples:
"Finish project report by 25th June" → dueDate: "2025-06-25T17:00:00.000Z"
"Meeting on June 25th at 3 PM" → dueDate: "2025-06-25T15:00:00.000Z"
"Call client by 15/6" → dueDate: "2025-06-15T17:00:00.000Z"
"Submit report by tomorrow 6 PM" → dueDate: "[tomorrow at 6 PM in ISO format]"

Rules:
- Extract the main action as the title
- Determine priority from urgency words (urgent, asap, important, etc.)
- Categorize based on context clues
- Parse dates/times relative to current time
- Extract hashtags (#tag) and mentions (@person) as tags
- ALWAYS try to parse dates, even if they seem complex`;

      const response = await this.openai.chat.completions.create({
        model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('AI Parser: No response from OpenAI');
        throw new Error('No response from AI');
      }

      console.log('AI Parser: Raw OpenAI response:', content);
      
      const parsed = JSON.parse(content);
      console.log('AI Parser: Parsed JSON:', parsed);
      
      // Validate and clean the response
      const result = this.validateAndCleanParsedTask(parsed);
      console.log('AI Parser: Final validated result:', result);
      
      return result;
      
    } catch (error) {
      console.error('AI parsing failed:', error);
      console.log('AI Parser: Falling back to rule-based parsing');
      return this.fallbackParse(input);
    }
  }

  private static validateAndCleanParsedTask(parsed: any): ParsedTask {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validCategories = ['work', 'personal', 'health', 'learning', 'other'];

    const result = {
      title: String(parsed.title || 'Untitled Task').trim(),
      description: parsed.description ? String(parsed.description).trim() : undefined,
      priority: validPriorities.includes(parsed.priority) ? parsed.priority : 'medium',
      category: validCategories.includes(parsed.category) ? parsed.category : 'other',
      dueDate: this.parseDueDate(parsed.dueDate),
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag: unknown) => typeof tag === 'string') : []
    };

    console.log('AI Parser: Validated task:', result);
    return result;
  }

  private static parseDueDate(dateString: any): Date | undefined {
    if (!dateString) return undefined;
    
    try {
      const date = parseISO(dateString);
      const isValidDate = isValid(date);
      console.log('AI Parser: Parsing date string:', dateString, 'Result:', date, 'Valid:', isValidDate);
      return isValidDate ? date : undefined;
    } catch (error) {
      console.error('AI Parser: Error parsing date:', dateString, error);
      return undefined;
    }
  }

  // Enhanced fallback parser with better absolute date handling
  private static fallbackParse(input: string): ParsedTask {
    console.log('Fallback Parser: Starting to parse input:', input);
    const lowercaseInput = input.toLowerCase();
    
    const result = {
      title: this.extractTitle(input),
      description: this.extractDescription(input),
      priority: this.extractPriority(lowercaseInput),
      category: this.extractCategory(lowercaseInput),
      dueDate: this.extractDueDate(input), // Pass original input for better date parsing
      tags: this.extractTags(input)
    };

    console.log('Fallback Parser: Final result:', result);
    return result;
  }

  private static extractTitle(input: string): string {
    let title = input;
    
    // Remove date patterns more comprehensively
    title = title.replace(/\b(by|at|on|before|after|until)\s+\d+\s*(am|pm|:\d+)/gi, '');
    title = title.replace(/\b(by|on|at)\s+\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '');
    title = title.replace(/\b(by|on|at)\s+\d{1,2}\/\d{1,2}(\/\d{4})?\b/gi, '');
    title = title.replace(/\b(today|tomorrow|this\s+week|next\s+week)\b/gi, '');
    title = title.replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');
    
    // Remove priority words
    const priorityWords = ['urgent', 'asap', 'critical', 'important', 'high priority', 'low priority'];
    priorityWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      title = title.replace(regex, '');
    });
    
    // Remove hashtags and mentions from title
    title = title.replace(/#\w+/g, '').replace(/@\w+/g, '');
    
    return title.trim().replace(/\s+/g, ' ') || 'Untitled Task';
  }

  private static extractDescription(input: string): string | undefined {
    const descMatch = input.match(/(?:notes?|details?|description):\s*(.+)/i);
    return descMatch ? descMatch[1].trim() : undefined;
  }

  private static extractPriority(input: string): ParsedTask['priority'] {
    if (/\b(urgent|asap|critical|emergency|now)\b/i.test(input)) return 'urgent';
    if (/\b(important|high priority|soon|quickly)\b/i.test(input)) return 'high';
    if (/\b(low priority|when possible|eventually|sometime)\b/i.test(input)) return 'low';
    
    // Default based on timing
    if (/\b(today|now|this morning|this afternoon)\b/i.test(input)) return 'high';
    
    return 'medium';
  }

  private static extractCategory(input: string): ParsedTask['category'] {
    const categories = {
      work: ['work', 'office', 'meeting', 'project', 'client', 'boss', 'colleague', 'deadline', 'presentation', 'report'],
      personal: ['personal', 'home', 'family', 'friend', 'birthday', 'appointment', 'shopping', 'clean', 'organize'],
      health: ['doctor', 'gym', 'exercise', 'workout', 'medicine', 'health', 'medical', 'therapy', 'dentist'],
      learning: ['study', 'learn', 'course', 'book', 'read', 'research', 'tutorial', 'practice', 'homework']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        return category as ParsedTask['category'];
      }
    }
    return 'other';
  }

  private static extractDueDate(input: string): Date | undefined {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Extract specific time (improved regex)
    const timeMatch = input.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    let targetHour = 17; // Default to 5 PM
    let targetMinute = 0;
    
    if (timeMatch) {
      targetHour = parseInt(timeMatch[1]);
      targetMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      
      if (timeMatch[3].toLowerCase() === 'pm' && targetHour !== 12) {
        targetHour += 12;
      } else if (timeMatch[3].toLowerCase() === 'am' && targetHour === 12) {
        targetHour = 0;
      }
    }

    // Handle absolute dates with ordinals (25th June, June 25th, etc.)
    const ordinalDatePatterns = [
      // "25th June", "25th of June"
      /\b(\d{1,2})(st|nd|rd|th)\s+(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
      // "June 25th", "June 25"
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(st|nd|rd|th)?\b/i
    ];

    for (const pattern of ordinalDatePatterns) {
      const match = input.match(pattern);
      if (match) {
        let day: number;
        let monthStr: string;
        
        if (pattern === ordinalDatePatterns[0]) {
          // "25th June" format
          day = parseInt(match[1]);
          monthStr = match[4];
        } else {
          // "June 25th" format
          monthStr = match[1];
          day = parseInt(match[2]);
        }
        
        const monthMap: { [key: string]: number } = {
          'january': 0, 'jan': 0,
          'february': 1, 'feb': 1,
          'march': 2, 'mar': 2,
          'april': 3, 'apr': 3,
          'may': 4,
          'june': 5, 'jun': 5,
          'july': 6, 'jul': 6,
          'august': 7, 'aug': 7,
          'september': 8, 'sep': 8,
          'october': 9, 'oct': 9,
          'november': 10, 'nov': 10,
          'december': 11, 'dec': 11
        };
        
        const month = monthMap[monthStr.toLowerCase()];
        if (month !== undefined && day >= 1 && day <= 31) {
          const targetDate = new Date(currentYear, month, day, targetHour, targetMinute);
          
          // If the date has passed this year, schedule for next year
          if (targetDate < now) {
            targetDate.setFullYear(currentYear + 1);
          }
          
          return targetDate;
        }
      }
    }

    // Handle numeric date formats (25/6, 6/25, 25-6, etc.)
    const numericDatePatterns = [
      /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b/, // DD/MM or DD/MM/YYYY
      /\b(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\b/ // DD.MM or DD.MM.YYYY
    ];

    for (const pattern of numericDatePatterns) {
      const match = input.match(pattern);
      if (match) {
        const first = parseInt(match[1]);
        const second = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : currentYear;
        
        // Try both DD/MM and MM/DD formats
        const dates = [
          new Date(year, second - 1, first, targetHour, targetMinute), // DD/MM
          new Date(year, first - 1, second, targetHour, targetMinute)  // MM/DD
        ];
        
        for (const date of dates) {
          if (isValid(date) && date.getMonth() < 12 && date.getDate() <= 31) {
            // If the date has passed this year, schedule for next year
            if (date < now && year === currentYear) {
              date.setFullYear(currentYear + 1);
            }
            return date;
          }
        }
      }
    }

    // Handle relative dates (existing logic)
    const lowercaseInput = input.toLowerCase();
    
    // Today patterns
    if (/\b(today|this morning|this afternoon|this evening|tonight)\b/i.test(lowercaseInput)) {
      const today = new Date();
      return setMinutes(setHours(today, targetHour), targetMinute);
    }
    
    // Tomorrow patterns
    if (/\b(tomorrow|tomorrow morning|tomorrow afternoon|tomorrow evening)\b/i.test(lowercaseInput)) {
      const tomorrow = addDays(now, 1);
      return setMinutes(setHours(tomorrow, targetHour), targetMinute);
    }
    
    // This week patterns
    if (/\b(this week|by friday|end of week)\b/i.test(lowercaseInput)) {
      const daysUntilFriday = 5 - now.getDay();
      const friday = addDays(now, daysUntilFriday > 0 ? daysUntilFriday : 7);
      return setMinutes(setHours(friday, targetHour), targetMinute);
    }
    
    // Next week patterns
    if (/\b(next week)\b/i.test(lowercaseInput)) {
      return setMinutes(setHours(addDays(now, 7), targetHour), targetMinute);
    }
    
    // Specific day patterns
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (new RegExp(`\\b${days[i]}\\b`, 'i').test(lowercaseInput)) {
        const currentDay = now.getDay();
        const targetDay = i;
        let daysToAdd = targetDay - currentDay;
        
        // If the day has passed this week, schedule for next week
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        
        const targetDate = addDays(now, daysToAdd);
        return setMinutes(setHours(targetDate, targetHour), targetMinute);
      }
    }
    
    // Relative day patterns (in X days)
    const relativeDayMatch = lowercaseInput.match(/\bin (\d+) days?\b/i);
    if (relativeDayMatch) {
      const daysToAdd = parseInt(relativeDayMatch[1]);
      const targetDate = addDays(now, daysToAdd);
      return setMinutes(setHours(targetDate, targetHour), targetMinute);
    }
    
    return undefined;
  }

  private static extractTags(input: string): string[] {
    const tags: string[] = [];
    
    // Extract hashtags
    const hashtagMatches = input.match(/#\w+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(tag => tag.substring(1)));
    }
    
    // Extract @mentions as context tags
    const mentionMatches = input.match(/@\w+/g);
    if (mentionMatches) {
      tags.push(...mentionMatches.map(mention => mention.substring(1)));
    }
    
    return tags;
  }
}