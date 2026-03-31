import { streamText } from '~/lib/.server/llm/stream-text';
import { withSecurity } from '~/lib/security';
import type { ActionFunctionArgs } from 'react-router';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('AI Suggestions');

const suggestionsRequestSchema = z.object({
  code: z.string().describe('Code to analyze for suggestions'),
  language: z.string().optional().describe('Programming language'),
  type: z
    .enum(['refactor', 'optimize', 'improve', 'modernize', 'document'])
    .optional()
    .describe('Type of suggestion'),
});

async function generateSuggestions(args: ActionFunctionArgs): Promise<Response> {
  try {
    const body = await args.request.json();
    const parsed = suggestionsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: true, message: 'Invalid request', details: parsed.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { code, language = 'javascript', type = 'improve' } = parsed.data;

    const typeGuides: Record<string, string> = {
      refactor: 'Suggest ways to refactor the code for better structure and maintainability.',
      optimize: 'Suggest performance optimizations and efficiency improvements.',
      improve: 'Suggest general improvements in code quality and readability.',
      modernize: 'Suggest modern language features, frameworks, or best practices.',
      document: 'Suggest documentation improvements and code comments.',
    };

    const systemPrompt = `You are an expert code mentor providing helpful suggestions for improvement.

${typeGuides[type]}

Format your suggestions as:
1. **Suggestion Title**: Brief description
   - Current approach: Show the current code pattern
   - Improved approach: Show the better way
   - Benefits: Why this is better
   - Example: Provide code example

Be practical and focus on the most impactful improvements.`;

    const prompt = `Review this ${language} code and provide ${type} suggestions:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamText({
            messages: [
              { role: 'user', content: prompt },
            ],
            systemPrompt,
            env: args.context.cloudflare?.env as Record<string, string> | undefined,
            options: { toolChoice: 'none' },
          });

          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              controller.enqueue(encoder.encode(part.textDelta));
            }
          }

          controller.close();
        } catch (error) {
          logger.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Suggestions error:', error);
    return new Response(JSON.stringify({ error: true, message: 'Suggestions failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const action = withSecurity(generateSuggestions, {
  allowedMethods: ['POST'],
  rateLimit: true,
});
