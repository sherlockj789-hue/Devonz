# codibl AI Features

codibl is a **completely free, open-source AI development platform** with powerful, built-in AI capabilities.

## Key Principles

✨ **100% Free** - No paid plans, no authentication required, all features unlocked
🔓 **Open Source** - Self-hosted, full control over your data
🚀 **Powerful AI** - Advanced AI analysis, debugging, and code improvement tools
🤖 **Multi-Provider** - Support for OpenAI, Claude, Google, Groq, and 20+ other AI providers

---

## Available AI Features

### 1. **AI Code Analysis** (`/api/ai-code-analyzer`)

Deep, intelligent code analysis powered by AI.

**Features:**
- Performance analysis - identify bottlenecks and optimization opportunities
- Security review - detect vulnerabilities and unsafe patterns
- Code quality assessment - readability, maintainability, structure
- Best practices check - language conventions and patterns
- Accessibility review - where applicable

**Usage:**
```javascript
const response = await fetch('/api/ai-code-analyzer', {
  method: 'POST',
  body: JSON.stringify({
    code: `function example() { /* code */ }`,
    language: 'javascript',
    focusAreas: ['performance', 'security', 'quality']
  })
});
```

### 2. **AI Debugging Assistant** (`/api/ai-debugger`)

Get instant help fixing bugs and errors.

**Features:**
- Root cause analysis - understand why the error happens
- Step-by-step fixes - detailed solution with code examples
- Prevention tips - avoid the error in the future
- Related issues - point out related potential bugs

**Usage:**
```javascript
const response = await fetch('/api/ai-debugger', {
  method: 'POST',
  body: JSON.stringify({
    code: `function example() { /* buggy code */ }`,
    error: 'Cannot read property of undefined',
    language: 'javascript',
    stackTrace: '...',
    context: 'Error occurs when user clicks button'
  })
});
```

### 3. **AI Code Suggestions** (`/api/ai-suggestions`)

Real-time improvement suggestions for your code.

**Types of Suggestions:**
- **refactor** - Improve structure and design
- **optimize** - Boost performance and efficiency
- **improve** - General code quality
- **modernize** - Use modern language features
- **document** - Better documentation and comments

**Usage:**
```javascript
const response = await fetch('/api/ai-suggestions', {
  method: 'POST',
  body: JSON.stringify({
    code: `function example() { /* code */ }`,
    language: 'javascript',
    type: 'refactor'
  })
});
```

### 4. **AI Code Refactoring** (`/api/ai-refactor`)

Automatically refactor code with AI while maintaining functionality.

**Target Styles:**
- `typescript` - Convert to TypeScript
- `es6` - Modern ES6+ patterns
- `functional` - Functional programming style
- `cleaner` - General cleanup and improvement
- `testable` - Make code more testable

**Usage:**
```javascript
const response = await fetch('/api/ai-refactor', {
  method: 'POST',
  body: JSON.stringify({
    code: `function example() { /* code */ }`,
    language: 'javascript',
    target: 'cleaner',
    instructions: 'Add TypeScript types'
  })
});
```

---

## Using AI Tools in Your Code

### React Hook: `useAITools`

Easy integration in React components:

```tsx
import { useAITools } from '~/lib/hooks/useAITools';

export function CodeReviewComponent() {
  const { analyzeCode, isLoading } = useAITools();

  const handleAnalyze = async () => {
    const result = await analyzeCode(
      { code: myCode, language: 'javascript' },
      (chunk) => console.log('Streaming:', chunk)
    );
    
    if (result.success) {
      console.log('Analysis:', result.content);
    }
  };

  return <button onClick={handleAnalyze}>Analyze Code</button>;
}
```

### Available Methods

```typescript
// Analyze code for quality, performance, security
analyzeCode(options: AnalyzerOptions, onChunk?: (chunk: string) => void)

// Get debugging help
debugCode(options: DebuggerOptions, onChunk?: (chunk: string) => void)

// Get improvement suggestions
getSuggestions(options: SuggestionsOptions, onChunk?: (chunk: string) => void)

// Refactor code
refactorCode(options: RefactorOptions)
```

---

## Core AI Capabilities (Already Built-in)

Beyond the new AI tools, codibl already includes:

### Chat & Streaming
- Real-time streaming responses
- Tool/function calling
- Multi-turn conversations
- Agent mode for autonomous execution

### Code Generation
- 5-phase code generation pipeline
  1. Blueprint - design the solution
  2. Plan - create detailed plan
  3. Scaffold - set up structure
  4. Implement - write the code
  5. Review - verify and fix

### Model Support
- **20+ LLM providers** - OpenAI, Anthropic, Google, Groq, Ollama, LMStudio, etc.
- **Reasoning models** - o1, o3, DeepSeek R1, QwQ with extended thinking
- **Model routing** - Use different models for different tasks
- **Token optimization** - Context summarization and continuation

### Developer Tools
- MCP (Model Context Protocol) tool integration
- Error detection and auto-fix
- Code search and analysis
- GitHub/GitLab integration
- Deployment to Vercel/Netlify

---

## Configuration

### No API Keys Required

codibl works out of the box with free defaults.

### Optional: Configure AI Providers

Set environment variables to use specific AI providers:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
GROQ_API_KEY=...
```

See `.env.example` for all available providers.

---

## Rate Limiting

All endpoints have generous rate limiting:
- General API: 100 requests per 15 minutes
- LLM calls: 10 requests per minute
- Provider APIs: 20-30 requests per minute

Rate limiting is per-IP address, not per user (no auth required).

---

## Streaming Responses

Most AI endpoints return **server-sent events (SSE)** for streaming:

```javascript
const response = await fetch('/api/ai-code-analyzer', {
  method: 'POST',
  body: JSON.stringify({ code, language })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log('Stream chunk:', chunk);
}
```

---

## Examples

### Example 1: Code Review in Action

```typescript
import { useAITools } from '~/lib/hooks/useAITools';

export function CodeReview() {
  const { analyzeCode } = useAITools();

  const review = async () => {
    const code = `
      const users = [];
      for (let i = 0; i < 1000; i++) {
        users.push({ id: i, name: 'User ' + i });
      }
    `;

    const result = await analyzeCode(
      { code, language: 'javascript', focusAreas: ['performance', 'quality'] }
    );

    console.log('Review:', result.content);
  };

  return <button onClick={review}>Review This Code</button>;
}
```

### Example 2: Auto-Debug

```typescript
const { debugCode } = useAITools();

const errorCode = `
  function getData() {
    const data = fetchData();
    return data.results.map(x => x.value);
  }
`;

const result = await debugCode({
  code: errorCode,
  error: 'Cannot read property of undefined',
  stackTrace: 'at getData (app.js:5:23)'
});

console.log('Fix:', result.content);
```

### Example 3: Refactoring

```typescript
const { refactorCode } = useAITools();

const oldCode = `
  function process(data) {
    var result = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i].active === true) {
        result.push(data[i].value * 2);
      }
    }
    return result;
  }
`;

const result = await refactorCode({
  code: oldCode,
  language: 'javascript',
  target: 'es6',
  instructions: 'Use modern functional patterns'
});

console.log('Refactored:', result.content);
```

---

## Architecture

### Endpoints

```
POST /api/ai-code-analyzer    → Code analysis
POST /api/ai-debugger        → Debugging help  
POST /api/ai-suggestions     → Improvement suggestions
POST /api/ai-refactor        → Code refactoring
```

### Files

- **Endpoints**: `app/routes/api.ai-*.ts`
- **Hook**: `app/lib/hooks/useAITools.ts`
- **Core LLM**: `app/lib/.server/llm/stream-text.ts`
- **Providers**: `app/lib/modules/llm/providers/`

---

## Contributing

codibl is open source and free. Contributions welcome!

- Add new AI features in `app/routes/api.ai-*.ts`
- Enhance the hook in `app/lib/hooks/useAITools.ts`
- Add provider support in `app/lib/modules/llm/providers/`

---

## License

MIT - Free to use, modify, and deploy

---

**Questions?** Check the main docs in `docs/` or open an issue!
