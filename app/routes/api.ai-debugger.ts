import { streamText } from '~/lib/.server/llm/stream-text';
import { withSecurity } from '~/lib/security';
import type { ActionFunctionArgs } from 'react-router';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('AI Debugger');

const debuggerRequestSchema = z.object({
  code: z.string().describe('Code to debug'),
  error: z.string().describe('Error message or description'),
  language: z.string().optional().describe('Programming language'),
  context: z.string().optional().describe('Additional context about the error'),
  stackTrace: z.string().optional().describe('Stack trace if available'),
});

async function debugCode(args: ActionFunctionArgs): Promise<Response> {
  try {
    const body = await args.request.json();
    const parsed = debuggerRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: true, message: 'Invalid request', details: parsed.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { code, error, language = 'javascript', context = '', stackTrace = '' } = parsed.data;

    const systemPrompt = `You are an expert debugging assistant. Your goal is to help developers identify and fix bugs quickly.

When given code and an error:
1. **Root Cause Analysis**: Identify the root cause of the error
2. **Explanation**: Explain why the error is happening in simple terms
3. **Solution**: Provide a step-by-step fix with code examples
4. **Prevention**: Suggest ways to prevent this error in the future
5. **Related Issues**: Point out any related potential bugs

Be precise, concise, and provide working code solutions.`;

    const prompt = `I'm getting an error and need help debugging.

**Error**: ${error}

${stackTrace ? `**Stack Trace**:\n${stackTrace}\n` : ''}
${context ? `**Context**: ${context}\n` : ''}

**Code**:
\`\`\`${language}
${code}
\`\`\`

Please help me understand and fix this error.`;

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
    logger.error('Debugging error:', error);
    return new Response(JSON.stringify({ error: true, message: 'Debugging failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const action = withSecurity(debugCode, {
  allowedMethods: ['POST'],
  rateLimit: true,
});
