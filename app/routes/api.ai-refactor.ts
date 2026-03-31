import { generateText } from 'ai';
import { withSecurity } from '~/lib/security';
import type { ActionFunctionArgs } from 'react-router';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';
import { LLMManager } from '~/lib/modules/llm/manager';

const logger = createScopedLogger('AI Refactor');

const refactorRequestSchema = z.object({
  code: z.string().describe('Code to refactor'),
  language: z.string().optional().describe('Programming language'),
  target: z
    .enum(['typescript', 'es6', 'functional', 'cleaner', 'testable'])
    .optional()
    .describe('Target refactoring style'),
  instructions: z.string().optional().describe('Custom refactoring instructions'),
});

async function refactorCode(args: ActionFunctionArgs): Promise<Response> {
  try {
    const body = await args.request.json();
    const parsed = refactorRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: true, message: 'Invalid request', details: parsed.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { code, language = 'javascript', target = 'cleaner', instructions = '' } = parsed.data;

    const llmManager = LLMManager.getInstance(import.meta.env);
    const provider = llmManager.getDefaultProvider();
    const model = provider.getDefaultModel();
    const modelInstance = provider.getModelInstance({
      model,
      baseURL: undefined,
      apiKey: undefined,
    });

    const systemPrompt = `You are an expert code refactorer. Your task is to improve code by:
- Maintaining the exact same functionality
- Following ${target} style/patterns
- Improving readability and maintainability
- Adding helpful comments where needed
${instructions ? `\nAdditional instructions: ${instructions}` : ''}

Return ONLY the refactored code without any explanations or markdown formatting.`;

    const prompt = `Refactor this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    try {
      const result = await generateText({
        model: modelInstance,
        system: systemPrompt,
        prompt,
        maxTokens: 4000,
      });

      return new Response(JSON.stringify({ success: true, refactored: result.text }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      logger.error('Refactoring error:', error);
      return new Response(
        JSON.stringify({ error: true, message: 'Refactoring failed', details: String(error) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  } catch (error) {
    logger.error('Refactor endpoint error:', error);
    return new Response(JSON.stringify({ error: true, message: 'Request processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const action = withSecurity(refactorCode, {
  allowedMethods: ['POST'],
  rateLimit: true,
});
