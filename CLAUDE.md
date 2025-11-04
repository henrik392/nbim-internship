# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js AI chatbot template built with the Vercel AI SDK, currently being adapted for an NBIM dividend reconciliation system prototype. The template uses React Server Components, Server Actions, and integrates with multiple LLM providers through Vercel AI Gateway.

## Development Commands

### Core Development
```bash
pnpm dev              # Start dev server with Turbopack
pnpm build            # Run migrations + production build
pnpm start            # Start production server
```

### Code Quality
```bash
pnpm lint             # Check code with Ultracite (Biome-based linter)
pnpm format           # Auto-fix code formatting and lint issues
```

### Database Management
```bash
pnpm db:migrate       # Apply database migrations (uses lib/db/migrate.ts)
pnpm db:generate      # Generate new migration files from schema changes
pnpm db:studio        # Open Drizzle Studio (interactive DB browser)
pnpm db:push          # Push schema changes directly (dev only)
pnpm db:pull          # Pull schema from database
```

### Testing
```bash
pnpm test             # Run Playwright end-to-end tests
```

## Architecture Overview

### AI SDK Integration Pattern

**Model Provider Setup** (`lib/ai/providers.ts`):
- Uses `@ai-sdk/gateway` to route through Vercel AI Gateway
- Supports multiple providers (xAI, OpenAI, Fireworks) via unified interface
- On Vercel: Auto-authenticated via OIDC tokens
- Non-Vercel: Requires `AI_GATEWAY_API_KEY` in `.env.local`

**Chat Streaming Flow** (`app/(chat)/api/chat/route.ts`):
1. Validates user session and rate limits via Auth.js
2. Uses `streamText()` from AI SDK with tools and system prompts
3. Returns `createUIMessageStream()` for real-time UI updates
4. Streams through `JsonToSseTransformStream()` for SSE protocol
5. Saves messages to Postgres after completion

**Key AI SDK Concepts**:
- `streamText()` - Server-side LLM text generation with streaming
- `streamObject()` - Structured output with Zod schema validation
- `convertToModelMessages()` - Transform UI messages to provider format
- `createUIMessageStream()` - Client-ready streaming with parts/attachments
- Tools execute during generation, results merged into stream via `dataStream.write()`

### Database Architecture (Drizzle ORM)

**Schema Location**: `lib/db/schema.ts`

**Core Tables**:
- `User` - Authentication (email, password hash)
- `Chat` - Conversations (title, userId, visibility, lastContext for usage tracking)
- `Message_v2` - Current message format with parts/attachments (replaces deprecated `Message`)
- `Document` - Artifacts created during chat (text, code, image, sheet kinds)
- `Suggestion` - Document editing suggestions from LLM
- `Vote_v2` - Message upvote/downvote (replaces deprecated `Vote`)
- `Stream` - Resumable stream tracking (requires Redis)

**Migration Strategy**:
- Message and Vote tables have deprecated versions (`Message`, `Vote`) and current versions (`Message_v2`, `Vote_v2`)
- Always use v2 tables for new code
- Run `pnpm db:migrate` before first build to initialize schema

**Query Pattern**:
- Queries in `lib/db/queries.ts` use Drizzle's type-safe query builder
- Never use raw SQL - use Drizzle methods for type safety

### App Router Structure

**Route Groups**:
- `(auth)` - Login/register pages (no shared layout overhead)
- `(chat)` - Main chat interface + API routes

**Server Components Pattern**:
- Page components are async Server Components by default
- Use Server Actions (inline `"use server"`) for mutations
- Client components only when needed (interactivity, hooks, browser APIs)

**API Routes** (`app/(chat)/api/*`):
- `/api/chat` - Main chat streaming endpoint (POST/DELETE)
- `/api/files` - File upload to Vercel Blob
- `/api/history` - Chat history CRUD
- `/api/document` - Document artifacts CRUD
- All routes use Auth.js session validation before processing

### Authentication Flow (Auth.js v5)

**Setup**: `app/(auth)/auth.ts` and `auth.config.ts`

**Key Patterns**:
- Credentials provider with bcrypt password hashing
- Sessions stored in database (not JWT)
- `await auth()` in Server Components/Actions to get session
- Middleware redirects unauthenticated users to `/login`

### Environment Variables

Required in `.env.local`:
- `POSTGRES_URL` - Neon Serverless Postgres connection string
- `AUTH_SECRET` - NextAuth.js secret (generate with `openssl rand -base64 32`)
- `AI_GATEWAY_API_KEY` - Only if deploying outside Vercel
- `REDIS_URL` - Optional, enables resumable streams

**Setup**: Copy `.env.example` to `.env.local` or use `vercel env pull`

## Code Quality Standards (Ultracite)

This project uses Ultracite (Biome-based linter) with strict rules. Key highlights:

### TypeScript
- **No `any` type** - Use proper typing or `unknown`
- **No enums** - Use `const` objects or string literal unions
- **No namespaces** - Use ES modules
- **No non-null assertions (`!`)** - Handle nullability properly
- **Use `import type` and `export type`** for type-only imports/exports
- **Initialize enum members explicitly**
- **Use `as const`** for literal types instead of type annotations

### React
- **All hook dependencies** must be correctly specified
- **Hooks only at top level** of component functions
- **Keys required** in iterators (no array indices as keys)
- **No nested component definitions**
- **No Array index in keys**
- **Use `<>...</>` instead of `<Fragment>`**

### Code Style
- **No `var`** - Use `const` or `let`
- **Use `===` and `!==`** (never `==` or `!=`)
- **No `console.*`** in production code (remove before committing)
- **Arrow functions** preferred over function expressions
- **Template literals** over string concatenation
- **`for...of`** instead of `Array.forEach()`
- **Numeric separators** in large numbers (e.g., `1_000_000`)

### Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML over ARIA when possible
- Include alt text for images (no "image" or "photo" in alt text)
- Button elements require explicit `type` attribute
- Label elements must have text content and be associated with inputs

### Next.js Specific
- **Don't use `<img>`** - Use Next.js `<Image>` component
- **Don't use `<head>`** - Use Next.js `metadata` API
- **Don't import `next/document`** outside `pages/_document.jsx`

**Run `pnpm format` before committing to auto-fix most issues**

## Important Technical Constraints

### Next.js 15 Canary + React 19 RC
- Uses experimental PPR (Partial Pre-Rendering)
- React Server Components are the default
- Mark client components explicitly with `"use client"` directive
- `async`/`await` directly in Server Components is standard

### Vercel AI Gateway
- Default provider uses gateway URL, not direct provider endpoints
- Model IDs like `"chat-model"` are gateway-defined, not provider model names
- Change providers in `lib/ai/providers.ts` by updating `createGatewayProvider` config
- For non-gateway providers, import directly (e.g., `import { openai } from '@ai-sdk/openai'`)

### Drizzle ORM Type Safety
- All schema types are auto-generated via `InferSelectModel<typeof table>`
- Migrations are TypeScript files in `lib/db/migrations/`
- Never modify migration files after creation - generate new ones

### Streaming Responses
- Chat API returns SSE (Server-Sent Events) via `JsonToSseTransformStream`
- Client uses `useChat()` hook from `@ai-sdk/react` to consume stream
- Tools execute during streaming and results appear in real-time

## Testing Structure

**Playwright Configuration**: `playwright.config.ts`

**Test Organization**:
- E2E tests in `tests/` directory
- Route handlers tested separately
- Page objects pattern for reusable selectors
- Fixtures for auth state and database setup

**Run Tests**: `pnpm test` (sets `PLAYWRIGHT=True` env var)

## Common Patterns

### Server Action with LLM Streaming
```typescript
"use server"

import { streamObject } from 'ai'
import { myProvider } from '@/lib/ai/providers'
import { z } from 'zod'

export async function generateSomething() {
  const result = await streamObject({
    model: myProvider.languageModel('chat-model'),
    schema: z.object({ /* schema */ }),
    prompt: 'Generate something...',
  })

  return result.toTextStreamResponse()
}
```

### Database Query Pattern
```typescript
import { db } from '@/lib/db'
import { chat } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getChatById({ id }: { id: string }) {
  const [result] = await db.select()
    .from(chat)
    .where(eq(chat.id, id))
    .limit(1)

  return result
}
```

### Protected Route Pattern
```typescript
import { auth } from '@/app/(auth)/auth'

export default async function ProtectedPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return <div>Protected content</div>
}
```

## File Upload Flow

1. Client uploads to `/api/files` endpoint
2. Server validates session and saves to Vercel Blob
3. Returns blob URL
4. Attach URL to message as attachment
5. LLM receives attachment metadata in message parts

## Document/Artifact System

**Document Kinds**: `text`, `code`, `image`, `sheet`

**Workflow**:
1. LLM uses `createDocument` tool during chat
2. Document saved to database with `kind` and `content`
3. Client renders appropriate editor (ProseMirror for text, CodeMirror for code, React Data Grid for sheets)
4. User can request edits via `updateDocument` tool
5. `Suggestion` records track proposed changes before user acceptance

## Resumable Streams (Optional)

Requires `REDIS_URL` in environment. Enables:
- Stream recovery after network interruption
- Uses `resumable-stream` package + Redis for state persistence
- Activate by uncommenting stream context code in `/api/chat/route.ts`

## Package Manager

**Always use `pnpm`** - specified in `package.json` as `"packageManager": "pnpm@9.12.3"`

Do not use `npm` or `yarn` - dependency resolution will differ.
