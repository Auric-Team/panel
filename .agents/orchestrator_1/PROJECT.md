# Project: AXIOS Executive Control Center Frontend UI/UX Overhaul

## Architecture
- Framework: Next.js 14 (App Router) in `src/app/`
- Styling: Tailwind CSS (`bg-slate-950`, `slate-900` glassmorphism, cyan/purple glowing borders, rounded-3xl cards)
- Icons: Lucide React (`lucide-react`)
- Charts: Recharts
- Build Tool: Bun (`bun run build`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Obsidian Dark Theme & Design System | `bg-slate-950`, slate-900 glassmorphism, cyan/purple glowing borders, crisp typography, badge indicators, subtle animations, rounded-3xl container cards | Milestone 1 | Survey |
| 2 | Tabbed Workspace & Navigation | 4 Main Tabs in `page.tsx`: 📊 Executive Overview & Analytics, 🔑 License Key Management & Generation, 👥 Reseller Network & Token Allocation, 📜 System Audit Logs & Security | Milestone 1 | Survey |
| 3 | Preset Duration Pills | Key Generator duration pills: 1 Day, 7 Days, 30 Days, Lifetime, Custom | Milestone 2 | Survey |
| 4 | Master Key Toggle | Glow styling for master key privilege toggle | Milestone 2 | Survey |
| 5 | Payment Proof Uploader | Drag & drop file upload zone with live thumbnail preview | Milestone 2 | Survey |
| 6 | Token Cost Breakdown Estimator | Dynamic calculation and display of token costs based on duration & quantity | Milestone 2 | Survey |
| 7 | Copy All Keys & CSV Export Tools | Quick copy formatted keys to clipboard and CSV export helper | Milestone 2 | Survey |
| 8 | High-Res Receipt Viewer Lightbox | `PaymentScreenshotModal.tsx` with Zoom In (+), Zoom Out (-), 90-degree Rotation, Reset View, Download button | Milestone 2 | Survey |
| 9 | Reseller Table & Status Badges | Reseller listing table with active/suspended/pending status badges | Milestone 3 | Survey |
| 10 | Token Adjustment Modal | Modal to add/deduct reseller tokens with confirmation | Milestone 3 | Survey |
| 11 | Reseller Analytics Modal | Modal showing 14-day sales chart (Recharts) + issued keys list | Milestone 3 | Survey |
| 12 | System Audit Logs & Security | Comprehensive security audit log table with filter/search and severe alert badges | Milestone 4 | Survey |
| 13 | Build & Verification | Verification via `bun run build` and forensic audit gate | Milestone 4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & Tabbed Workspace Layout | Global Tailwind theme, `page.tsx` tab structure, Executive Overview component | None | DONE |
| M2 | Interactive Key Generator & Receipt Lightbox | Key generation form (duration pills, master key, proof uploader, token estimator, export/copy tools) & `PaymentScreenshotModal.tsx` | M1 | DONE |
| M3 | Reseller Network & Token Manager | Reseller table, token adjustment modal, 14-day sales chart analytics modal | M1 | DONE |
| M4 | System Audit Logs & Final Build Verification | Audit log view, full workspace integration, `bun run build` check, forensic audit gate | M1, M2, M3 | DONE |

## Interface Contracts
### Key Generator ↔ Receipt Lightbox
- Key Generator allows clicking payment receipt thumbnail to open `PaymentScreenshotModal`.
- Modal accepts `isOpen: boolean`, `onClose: () => void`, `imageSrc: string`, `paymentId?: string`.

### Reseller Table ↔ Reseller Modals
- Reseller table triggers `TokenAdjustmentModal` with `resellerId`, `currentTokens`, `onSave`.
- Reseller table triggers `ResellerAnalyticsModal` with `resellerId`, `resellerName`, `salesData: 14DayData[]`, `issuedKeys: Key[]`.

## Code Layout
`C:\Users\Abhi\Coding\projects\panel\frontend`
- `src/app/page.tsx`: Executive Workspace shell with 4 tabs
- `src/components/Navbar.tsx`: Executive Top Navigation with status badges
- `src/components/Overview.tsx`: Executive Overview & Analytics tab
- `src/components/KeyManagement.tsx`: License Key Management & Key Generator tab
- `src/components/PaymentScreenshotModal.tsx`: High-Res Lightbox Modal
- `src/components/ResellerManagement.tsx`: Reseller Network & Token Manager tab
- `src/components/AuditLogs.tsx`: System Audit Logs tab
- `src/components/ui/`: Reusable Tailwind UI elements
