import { describe, it, expect } from 'vitest';
import { extractMcpResultText } from './ToolInvocations';

describe('extractMcpResultText', () => {
  describe('string results', () => {
    it('returns string result directly', () => {
      const result = extractMcpResultText('Hello world');
      expect(result).toEqual({ text: 'Hello world', isError: false });
    });

    it('returns empty string result', () => {
      const result = extractMcpResultText('');
      expect(result).toEqual({ text: '', isError: false });
    });
  });

  describe('MCP protocol format (content array)', () => {
    it('extracts text from single content item', () => {
      const mcpResult = {
        content: [{ type: 'text', text: 'Available pages:\n- Page 1\n- Page 2' }],
        isError: false,
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({
        text: 'Available pages:\n- Page 1\n- Page 2',
        isError: false,
      });
    });

    it('joins multiple text content items', () => {
      const mcpResult = {
        content: [
          { type: 'text', text: 'First section' },
          { type: 'text', text: 'Second section' },
        ],
        isError: false,
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({
        text: 'First section\n\nSecond section',
        isError: false,
      });
    });

    it('skips non-text content types', () => {
      const mcpResult = {
        content: [
          { type: 'text', text: 'Text content' },
          { type: 'image', data: 'base64data' },
          { type: 'resource', uri: 'file://test' },
        ],
        isError: false,
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({ text: 'Text content', isError: false });
    });

    it('returns null when content has no text items', () => {
      const mcpResult = {
        content: [{ type: 'image', data: 'base64data' }],
        isError: false,
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({ text: null, isError: false });
    });

    it('detects isError flag', () => {
      const mcpResult = {
        content: [{ type: 'text', text: 'Something went wrong' }],
        isError: true,
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({
        text: 'Something went wrong',
        isError: true,
      });
    });
  });

  describe('structuredContent.result format', () => {
    it('extracts text from structuredContent.result', () => {
      const mcpResult = {
        content: [],
        isError: false,
        structuredContent: {
          result: '# Wiki Structure\n\n- Section 1\n- Section 2',
        },
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({
        text: '# Wiki Structure\n\n- Section 1\n- Section 2',
        isError: false,
      });
    });

    it('prefers content array over structuredContent', () => {
      const mcpResult = {
        content: [{ type: 'text', text: 'From content array' }],
        isError: false,
        structuredContent: { result: 'From structured content' },
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({ text: 'From content array', isError: false });
    });
  });

  describe('direct result field', () => {
    it('extracts text from direct result field', () => {
      const mcpResult = {
        result: 'Direct result text',
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({ text: 'Direct result text', isError: false });
    });
  });

  describe('non-text results', () => {
    it('returns null for null input', () => {
      const result = extractMcpResultText(null);
      expect(result).toEqual({ text: null, isError: false });
    });

    it('returns null for undefined input', () => {
      const result = extractMcpResultText(undefined);
      expect(result).toEqual({ text: null, isError: false });
    });

    it('returns null for number input', () => {
      const result = extractMcpResultText(42);
      expect(result).toEqual({ text: null, isError: false });
    });

    it('returns null for boolean input', () => {
      const result = extractMcpResultText(true);
      expect(result).toEqual({ text: null, isError: false });
    });

    it('returns null for pure object result without text fields', () => {
      const mcpResult = {
        data: { key: 'value', nested: { a: 1 } },
      };
      const result = extractMcpResultText(mcpResult);
      expect(result).toEqual({ text: null, isError: false });
    });
  });

  describe('real-world DeepWiki result', () => {
    it('extracts wiki structure from a real DeepWiki response', () => {
      const deepWikiResult = {
        content: [
          {
            type: 'text',
            text: 'Available pages for facebook/react:\n\n- 1 Overview\n - 1.1 Repository Structure\n- 2 Feature Flags\n- 3 Build System',
          },
        ],
        isError: false,
        structuredContent: {
          result:
            'Available pages for facebook/react:\n\n- 1 Overview\n - 1.1 Repository Structure\n- 2 Feature Flags\n- 3 Build System',
        },
      };
      const result = extractMcpResultText(deepWikiResult);
      expect(result.text).toContain('Available pages for facebook/react');
      expect(result.text).toContain('- 1 Overview');
      expect(result.isError).toBe(false);
    });
  });
});
