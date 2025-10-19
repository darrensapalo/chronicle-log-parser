# Next.js App Router Migration Plan

## Overview
Migrate from Pages Router to App Router to take advantage of:
- React Server Components (RSC)
- Improved performance with automatic code splitting
- Better data fetching patterns
- Streaming and Suspense support
- Simplified layouts and nested routing

## Current Structure (Pages Router)

```
pages/
├── _app.tsx                    # Global app wrapper
├── index.tsx                   # Home page with LogParser
├── log_parser.tsx              # Main parser component
├── markdown.tsx                # Markdown display component
└── api/
    ├── hello.ts
    ├── openai-api.ts
    ├── parse-log.ts
    └── transformations/
        ├── index.ts
        ├── [id].ts
        └── [id]/report.ts
```

## Target Structure (App Router)

```
app/
├── layout.tsx                  # Root layout (replaces _app.tsx)
├── page.tsx                    # Home page
├── providers.tsx               # Client-side providers (if needed)
├── log-parser/
│   └── page.tsx                # Log parser page (optional separate route)
└── api/
    ├── hello/
    │   └── route.ts
    ├── openai-api/
    │   └── route.ts
    ├── parse-log/
    │   └── route.ts
    └── transformations/
        ├── route.ts
        ├── [id]/
        │   ├── route.ts
        │   └── report/
        │       └── route.ts

components/
├── log-parser.tsx              # Client component
├── markdown-viewer.tsx         # Can be server component
└── ui/                         # Shared UI components
    ├── modal.tsx
    └── spinner.tsx

lib/
├── prisma.ts
├── logstash-parser.ts
├── udm-mapper.ts
└── utils.ts
```

## Migration Steps

### Phase 1: Preparation (Non-Breaking)
**Goal:** Prepare codebase without breaking existing functionality

1. **Create `app/` directory alongside `pages/`**
   - Next.js supports both routers simultaneously during migration
   - Allows incremental migration

2. **Extract reusable components**
   - Move `log_parser.tsx` → `components/log-parser.tsx`
   - Move `markdown.tsx` → `components/markdown-viewer.tsx`
   - Add `'use client'` directive to client components

3. **Update imports in Pages Router**
   - Keep Pages Router working with new component locations

4. **Test that everything still works**

### Phase 2: Migrate API Routes
**Goal:** Convert API routes to new Route Handlers

#### API Route Changes

**Before (Pages Router):**
```typescript
// pages/api/parse-log.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  // ... logic
  res.status(200).json({ success: true, data });
}
```

**After (App Router):**
```typescript
// app/api/parse-log/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // ... logic
  return NextResponse.json({ success: true, data });
}
```

#### Migration Order for APIs

1. **Simple routes first:**
   - `api/hello` → `app/api/hello/route.ts`

2. **Core functionality:**
   - `api/parse-log` → `app/api/parse-log/route.ts`
   - `api/transformations` → `app/api/transformations/route.ts`

3. **Dynamic routes:**
   - `api/transformations/[id]` → `app/api/transformations/[id]/route.ts`
   - `api/transformations/[id]/report` → `app/api/transformations/[id]/report/route.ts`

### Phase 3: Migrate Pages
**Goal:** Convert page components to App Router

#### 1. Create Root Layout

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Google Chronicle Log Parser',
  description: 'Parse logs and transform to UDM format',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5QJBTE12CN');
          `}
        </Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-5QJBTE12CN" />
        {children}
      </body>
    </html>
  )
}
```

#### 2. Create Home Page

```typescript
// app/page.tsx
import LogParser from '@/components/log-parser'

export default function Home() {
  return (
    <main className="h-full bg-white p-8 overflow-y-auto flex flex-col">
      <div className="flex flex-col w-full">
        <LogParser />
      </div>

      <footer className="flex flex-col mt-8">
        <div className="flex flex-row">
          <span className="text-xs italic mt-4 text-slate-400">
            Made for <a className="link underline underline-offset-4" href="https://www.linkedin.com/in/carmela-sevilla/">Carmela Sevilla</a>.
            {/* ... rest of footer */}
          </span>
        </div>
      </footer>
    </main>
  )
}
```

#### 3. Update LogParser Component

```typescript
// components/log-parser.tsx
'use client'

import { useState, useCallback } from 'react'
import axios from 'axios'
import MarkdownViewer from './markdown-viewer'

export default function LogParser() {
  const [markdownContent, setMarkdownContent] = useState<string>(`...`)

  const handleParse = useCallback((response: string) => {
    setMarkdownContent(response)
  }, [])

  // ... rest of component

  return (
    <>
      {/* Parser UI */}
      <MarkdownViewer content={markdownContent} />
    </>
  )
}
```

### Phase 4: Optimize with Server Components
**Goal:** Leverage Server Components for better performance

#### Identify Server vs Client Components

**Server Components (default):**
- Markdown viewer (if no interactivity)
- Footer
- Any static content

**Client Components (`'use client'`):**
- LogParser (uses useState, form handling)
- Modals (uses state)
- Any component with browser APIs

#### Example Server Component

```typescript
// components/markdown-viewer.tsx (Server Component)
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerProps {
  content: string
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

### Phase 5: Remove Pages Router
**Goal:** Clean up old code

1. **Verify all routes work in App Router**
2. **Delete `pages/` directory** (except `pages/api` temporarily if needed)
3. **Update imports** throughout the codebase
4. **Remove unused dependencies** related to Pages Router
5. **Update documentation**

## Key Differences to Handle

### 1. Client vs Server Components

**Pages Router:** Everything is a client component by default
**App Router:** Everything is a server component by default

**Solution:** Add `'use client'` directive to components that need:
- useState, useEffect, other hooks
- Event handlers
- Browser APIs
- Context providers

### 2. Data Fetching

**Pages Router:** `getServerSideProps`, `getStaticProps`
**App Router:** Server Components with async/await

```typescript
// App Router - Server Component
async function getTransformations() {
  const res = await fetch('http://localhost:3000/api/transformations', {
    cache: 'no-store' // or 'force-cache' for static
  })
  return res.json()
}

export default async function HistoryPage() {
  const data = await getTransformations()
  return <TransformationsList data={data} />
}
```

### 3. Routing and Navigation

**Pages Router:** `useRouter` from `next/router`
**App Router:** `useRouter` from `next/navigation`

```typescript
// Before
import { useRouter } from 'next/router'
const router = useRouter()
router.push('/log_parser?transformationId=123')

// After
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/log-parser?transformationId=123')
```

### 4. Layouts

**Pages Router:** `_app.tsx` wraps everything
**App Router:** Nested layouts with `layout.tsx`

Can create layouts per route:
```
app/
├── layout.tsx              # Root layout
└── log-parser/
    ├── layout.tsx          # Log parser specific layout
    └── page.tsx
```

### 5. Loading States

**Pages Router:** Manual loading states
**App Router:** `loading.tsx` and Suspense

```typescript
// app/log-parser/loading.tsx
export default function Loading() {
  return <div className="spinner">Loading...</div>
}
```

## Benefits After Migration

### Performance
- ✅ Automatic code splitting
- ✅ Server Components reduce client-side JavaScript
- ✅ Streaming for faster initial page loads
- ✅ Better prefetching

### Developer Experience
- ✅ Simpler data fetching (no getServerSideProps)
- ✅ Better TypeScript support
- ✅ Nested layouts
- ✅ Colocation of components and routes

### SEO
- ✅ Better server-side rendering
- ✅ Faster time to first byte
- ✅ Improved Core Web Vitals

## Potential Issues & Solutions

### Issue 1: State Management Across Components
**Problem:** Can't use React Context in Server Components
**Solution:**
- Use client components for stateful UI
- Pass server data as props to client components
- Use URL state for shareable state

### Issue 2: Third-party Libraries
**Problem:** Some libraries don't support Server Components yet
**Solution:**
- Wrap in client components
- Check for `'use client'` in library
- Use dynamic imports if needed

### Issue 3: Environment Variables
**Problem:** Different handling of env vars
**Solution:**
- `NEXT_PUBLIC_*` for client-accessible vars (same as before)
- Server-only vars work in Server Components and Route Handlers
- Be careful not to expose secrets to client

## Testing Strategy

### 1. Parallel Testing
- Run both routers side-by-side
- Test `/log_parser` (pages) vs `/log-parser` (app)
- Compare functionality and performance

### 2. Feature Testing Checklist
- [ ] Home page loads correctly
- [ ] Log parsing works
- [ ] Database operations succeed
- [ ] History modal functions
- [ ] URL parameters work
- [ ] Analytics tracking works
- [ ] API routes respond correctly
- [ ] Error handling works
- [ ] Loading states display
- [ ] Mobile responsive

### 3. Performance Testing
- Compare Lighthouse scores
- Measure bundle sizes
- Check Time to Interactive (TTI)
- Verify Core Web Vitals

## Rollback Plan

If migration has critical issues:

1. **Keep Pages Router:** Don't delete until confident
2. **Use Git branches:** Migrate on separate branch
3. **Feature flags:** Can toggle between routers
4. **Gradual rollout:** Migrate one route at a time

## Timeline Estimate

- **Phase 1 (Preparation):** 1-2 days
- **Phase 2 (API Migration):** 2-3 days
- **Phase 3 (Pages Migration):** 3-4 days
- **Phase 4 (Optimization):** 2-3 days
- **Phase 5 (Cleanup):** 1 day
- **Testing & Fixes:** 2-3 days

**Total:** ~2 weeks for careful, incremental migration

## Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Incremental Adoption Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## Next Steps

1. Review and approve this plan
2. Create a new Git branch: `feat/app-router-migration`
3. Start with Phase 1: Create `app/` directory
4. Migrate one API route as proof of concept
5. Test thoroughly before proceeding
