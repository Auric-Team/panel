---
name: frontend-mastery
description: >-
  World-class modern frontend development skill. Use when designing, building, optimizing, or debugging React, Next.js, TailwindCSS, TypeScript UI components, state management, animations, responsive layouts, web accessibility, and performance.
---

# Frontend Mastery Skill

An expert engineering runbook and procedural system for building ultra-responsive, accessible, high-performance, and visually captivating frontend applications.

---

## 1. Core Architecture & Standards

### 1.1 Technology Guidelines
- **Framework**: Next.js 14+ (App Router / Pages Router) & React 18/19.
- **Language**: Strict TypeScript with robust typing (avoid `any`, enforce strict null checks and proper generic interfaces).
- **Styling**: Tailwind CSS + Modern CSS Variables for dynamic theme switching without layout shift.
- **State Management**:
  - Server state: TanStack React Query / SWR / Server Components.
  - Client global state: Zustand (lightweight, zero boilerplate) or Context API for simple scopes.
  - Local form state: React Hook Form + Zod validation.
- **Icons & UI Kit**: Lucide React, Radix UI primitives, Headless UI.

### 1.2 Component Hierarchy & Structure
```text
src/
├── components/
│   ├── ui/             # Atomic, reusable primitives (Button, Modal, Input, Badge, Card)
│   ├── layout/         # Shell, Sidebar, Header, Footer, Container
│   └── modules/        # Domain-specific feature widgets (UserTable, AnalyticsChart)
├── hooks/              # Custom reusable React hooks (useDebounce, useMediaQuery, useLocalStorage)
├── lib/                # Utilities, API client (fetcher/axios), formatting, helpers
├── types/              # Global TypeScript declarations and API payload types
└── styles/             # Global CSS and custom utility classes
```

---

## 2. Standard Workflow & Procedures

### Step 1: Component Specification & Scaffolding
When creating any UI component:
1. Define TypeScript interface with explicit props (including children, variants, callbacks).
2. Use modular compound components or atomic props (`variant`, `size`, `isLoading`, `disabled`).
3. Ensure keyboard accessibility (`aria-*`, `tabIndex`, `onKeyDown`).

### Step 2: Visual Styling & Responsive Design
- Default to mobile-first responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
- Apply high-contrast, clean typography with proper tracking and line-height.
- Incorporate subtle hover and active micro-interactions (`transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99]`).
- Prevent content jumping: allocate skeleton loaders or explicit aspect-ratios (`aspect-video`, `min-h-[...]`).

### Step 3: Data Fetching & State Lifecycle
- Encapsulate network calls inside typed fetcher functions.
- Handle all 4 lifecycle states: **Loading**, **Error**, **Empty**, and **Success**.
- Implement optimistic updates where immediate feedback is beneficial.

### Step 4: Verification & Performance Audit
1. Run TypeScript check: `bun tsc --noEmit` or `npm run build`.
2. Verify responsive layout on mobile, tablet, and widescreen.
3. Check lighthouse/web-vitals metrics (CLS < 0.1, LCP < 2.5s, FID < 100ms).

---

## 3. Best-in-Class Patterns & Code Recipes

### Clean Form Handling with Zod & React Hook Form
```tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;
```

### Resilient Async Data Fetching Hook
```tsx
import { useState, useEffect } from 'react';

export function useAsync<T>(asyncFn: () => Promise<T>, immediate = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await asyncFn();
      setData(response);
      return response;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { execute, loading, data, error };
}
```

---

## 4. References & Tooling
- Read [UI Best Practices Guide](./references/ui_best_practices.md) for UX, color tokens, and accessibility checklists.
