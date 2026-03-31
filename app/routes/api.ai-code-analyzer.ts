import { streamText } from '~/lib/.server/llm/stream-text';
import { withSecurity } from '~/lib/security';
import type { ActionFunctionArgs } from 'react-router';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('AI Code Analyzer');

const analyzerRequestSchema = z.object({
  code: z.string().describe('Code to analyze'),
  language: z.string().optional().describe('Programming language'),
  focusAreas: z
    .array(z.enum(['performance', 'security', 'quality', 'accessibility', 'best-practices']))
    .optional()
    .describe('Areas to focus analysis on'),
});

async function analyzeCode(args: ActionFunctionArgs): Promise<Response> {
  try {
    const body = await args.request.json();
    const parsed = analyzerRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: true, message: 'Invalid request', details: parsed.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { code, language = 'javascript', focusAreas = ['quality', 'best-practices'] } = parsed.data;

    const systemPrompt = `You are an expert code reviewer and analyzer. Analyze the provided code and give detailed insights on ${focusAreas.join(', ')}.

Your analysis should include:
1. **Code Quality**: readability, maintainability, structure
2. **Performance**: potential bottlenecks, optimization opportunities
3. **Security**: potential vulnerabilities, security best practices
4. **Best Practices**: adherence to language conventions and patterns
5. **Accessibility**: if applicable to the code type

Format your response with clear sections and actionable recommendations.`;

    const prompt = `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

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
    logger.error('Code analysis error:', error);
    return new Response(JSON.stringify({ error: true, message: 'Analysis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const action = withSecurity(analyzeCode, {
  allowedMethods: ['POST'],
  rateLimit: true,
});
