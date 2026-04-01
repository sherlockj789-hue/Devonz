import { useState, useCallback } from 'react';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('AI Tools');

export type AIToolType = 'analyzer' | 'debugger' | 'suggestions' | 'refactor';

export interface AnalyzerOptions {
  code: string;
  language?: string;
  focusAreas?: ('performance' | 'security' | 'quality' | 'accessibility' | 'best-practices')[];
}

export interface DebuggerOptions {
  code: string;
  error: string;
  language?: string;
  context?: string;
  stackTrace?: string;
}

export interface SuggestionsOptions {
  code: string;
  language?: string;
  type?: 'refactor' | 'optimize' | 'improve' | 'modernize' | 'document';
}

export interface RefactorOptions {
  code: string;
  language?: string;
  target?: 'typescript' | 'es6' | 'functional' | 'cleaner' | 'testable';
  instructions?: string;
}

export interface AIToolResult {
  success: boolean;
  content?: string;
  error?: string;
  isStreaming?: boolean;
}

/**
 * Comprehensive AI Tools Hook
 * Provides methods to leverage advanced AI capabilities for code analysis, debugging, and suggestions
 */
export function useAITools() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState<AIToolType | null>(null);

  /**
   * Analyze code for quality, performance, security, etc.
   */
  const analyzeCode = useCallback(
    async (options: AnalyzerOptions, onChunk?: (chunk: string) => void): Promise<AIToolResult> => {
      setIsLoading(true);
      setCurrentTool('analyzer');

      try {
        const response = await fetch('/api/ai-code-analyzer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.message || 'Analysis failed' };
        }

        if (onChunk && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              fullText += chunk;
              onChunk(chunk);
            }
          } finally {
            reader.releaseLock();
          }

          return { success: true, content: fullText, isStreaming: true };
        }

        const text = await response.text();
        return { success: true, content: text };
      } catch (error) {
        logger.error('Code analysis error:', error);
        return { success: false, error: String(error) };
      } finally {
        setIsLoading(false);
        setCurrentTool(null);
      }
    },
    [],
  );

  /**
   * Get AI help debugging an error
   */
  const debugCode = useCallback(
    async (options: DebuggerOptions, onChunk?: (chunk: string) => void): Promise<AIToolResult> => {
      setIsLoading(true);
      setCurrentTool('debugger');

      try {
        const response = await fetch('/api/ai-debugger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.message || 'Debugging failed' };
        }

        if (onChunk && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              fullText += chunk;
              onChunk(chunk);
            }
          } finally {
            reader.releaseLock();
          }

          return { success: true, content: fullText, isStreaming: true };
        }

        const text = await response.text();
        return { success: true, content: text };
      } catch (error) {
        logger.error('Debug error:', error);
        return { success: false, error: String(error) };
      } finally {
        setIsLoading(false);
        setCurrentTool(null);
      }
    },
    [],
  );

  /**
   * Get AI suggestions for improving code
   */
  const getSuggestions = useCallback(
    async (options: SuggestionsOptions, onChunk?: (chunk: string) => void): Promise<AIToolResult> => {
      setIsLoading(true);
      setCurrentTool('suggestions');

      try {
        const response = await fetch('/api/ai-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.message || 'Suggestions failed' };
        }

        if (onChunk && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              fullText += chunk;
              onChunk(chunk);
            }
          } finally {
            reader.releaseLock();
          }

          return { success: true, content: fullText, isStreaming: true };
        }

        const text = await response.text();
        return { success: true, content: text };
      } catch (error) {
        logger.error('Suggestions error:', error);
        return { success: false, error: String(error) };
      } finally {
        setIsLoading(false);
        setCurrentTool(null);
      }
    },
    [],
  );

  /**
   * Refactor code with AI
   */
  const refactorCode = useCallback(async (options: RefactorOptions): Promise<AIToolResult> => {
    setIsLoading(true);
    setCurrentTool('refactor');

    try {
      const response = await fetch('/api/ai-refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Refactoring failed' };
      }

      const data = await response.json();
      return { success: data.success, content: data.refactored, error: data.error };
    } catch (error) {
      logger.error('Refactor error:', error);
      return { success: false, error: String(error) };
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
    }
  }, []);

  return {
    // State
    isLoading,
    currentTool,

    // Methods
    analyzeCode,
    debugCode,
    getSuggestions,
    refactorCode,
  };
}
