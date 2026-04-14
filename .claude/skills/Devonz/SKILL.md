```markdown
# Devonz Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you how to contribute to the Devonz codebase, a TypeScript project built with Vite. You'll learn the project's coding conventions, how to implement and test new features, manage database schema changes, upgrade dependencies, update CI workflows, and refactor components for performance. The guide also covers commit message patterns and provides ready-to-use commands for common workflows.

---

## Coding Conventions

### File Naming

- Use **camelCase** for file names.
  - Example: `userProfile.tsx`, `apiUtils.ts`

### Import Style

- Use **absolute imports** from the project root.
  - Example:
    ```ts
    import { fetchUser } from 'app/lib/api/fetchUser';
    ```

### Export Style

- Use **named exports**.
  - Example:
    ```ts
    // Good
    export function getUser() { ... }
    export const USER_ROLE = 'admin';

    // Avoid default exports
    ```

### Commit Messages

- **Conventional commit** format.
- Prefixes: `fix`, `feat`, `chore`, `refactor`
- Example:
  ```
  feat(api): add user profile endpoint
  fix(db): correct migration for user table
  ```

---

## Workflows

### Add or Update API Endpoint

**Trigger:** When you want to introduce or modify an API endpoint  
**Command:** `/new-api-endpoint`

1. Create or update the route file:  
   `app/routes/api.[endpoint].ts`
2. Update or create corresponding type definitions:  
   `.react-router/types/app/routes/+types/api.[endpoint].ts`
3. Add or update tests:  
   `app/test/routes/api.[endpoint].test.ts`
4. Update shared API utilities or schemas if needed:  
   `app/lib/api/schemas.ts`

**Example:**
```ts
// app/routes/api.user.ts
import { getUser } from 'app/lib/api/user';
export function loader() { ... }
```

---

### Database Schema Migration

**Trigger:** When you want to change the database structure  
**Command:** `/new-table`

1. Edit the schema:  
   `app/lib/.server/db/schema.ts`
2. Generate or update migration SQL:  
   `drizzle/0000_*.sql`
3. Update migration metadata:  
   `drizzle/meta/`
4. Update Drizzle config if needed:  
   `drizzle.config.ts`
5. Update or create related API routes:  
   `app/routes/api.db.[table].ts`
6. Update or create related tests:  
   `app/test/routes/api.db.[table].test.ts`

**Example:**
```ts
// app/lib/.server/db/schema.ts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
});
```

---

### Dependency Upgrade

**Trigger:** When you want to keep dependencies up to date  
**Command:** `/upgrade-deps`

1. Update `package.json` with new versions.
2. Update `pnpm-lock.yaml`.
3. For major upgrades, update code for breaking changes (e.g., component APIs).
4. Update `vite.config.ts` or other build configs if needed.

**Example:**
```json
// package.json
"dependencies": {
  "react": "^18.3.0"
}
```

---

### Feature Development with Docs and Tests

**Trigger:** When you want to add a new user-facing feature  
**Command:** `/new-feature`

1. Implement the feature in:
   - `app/components/`
   - `app/lib/`
   - `app/routes/`
2. Add or update tests:
   - `app/test/`
   - `app/lib/.server/**/*.test.ts`
3. Update or add documentation:
   - `docs/`
   - `plan/`
4. Update types if needed:
   - `app/types/`

**Example:**
```tsx
// app/components/userGreeting.tsx
export function UserGreeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}
```

---

### CI Workflow Update

**Trigger:** When you want to update CI/CD processes or actions  
**Command:** `/update-ci`

1. Edit `.github/workflows/ci.yml` to update actions or steps.
2. Commit with a message like `chore(ci): update Node version`.

**Example:**
```yaml
# .github/workflows/ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
```

---

### Refactor and Lazy Load Components

**Trigger:** When you want to improve performance or code structure  
**Command:** `/refactor-lazy-load`

1. Split large components in `app/components/` into smaller files.
2. Implement `React.lazy` or dynamic imports for heavy components.
3. Update references in parent components.
4. Update `package.json` and `vite.config.ts` if needed.

**Example:**
```tsx
// app/components/HeavyComponent.tsx
export function HeavyComponent() { ... }

// app/components/Parent.tsx
import React, { Suspense } from 'react';
const HeavyComponent = React.lazy(() => import('app/components/HeavyComponent'));

export function Parent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

---

## Testing Patterns

- **Framework:** [Vitest](https://vitest.dev/)
- **File pattern:** `*.test.ts`
- **Location:**  
  - `app/test/`  
  - `app/lib/.server/**/*.test.ts`

**Example:**
```ts
// app/test/routes/api.user.test.ts
import { describe, it, expect } from 'vitest';
import { getUser } from 'app/lib/api/user';

describe('getUser', () => {
  it('returns user data', async () => {
    const user = await getUser(1);
    expect(user).toHaveProperty('id', 1);
  });
});
```

---

## Commands

| Command              | Purpose                                               |
|----------------------|-------------------------------------------------------|
| /new-api-endpoint    | Add or update an API endpoint                         |
| /new-table           | Add or update a database table and related code       |
| /upgrade-deps        | Upgrade dependencies and handle breaking changes      |
| /new-feature         | Add a new user-facing feature with docs and tests     |
| /update-ci           | Update CI workflow files                              |
| /refactor-lazy-load  | Refactor and lazy-load components for performance     |
```
