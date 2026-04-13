---
name: ui-patterns
description: Guidelines for maintaining a consistent UI/UX across the UniPortal application using Tailwind CSS and React component patterns.
---

# UI Patterns & Design System: UniPortal

This skill defines the visual language and component architecture for the application. Use it to ensure consistency in layouts, color usage, and interactive elements.

## Core Design Principles

### 1. Color System (Tailwind)
The application has transitioned to a modern, clean, minimalist dashboard aesthetic based on Tailwind defaults (Slate/Teal/Emerald).
- **Backgrounds**: `bg-slate-50` (or `bg-[#f9fafb]`) for main pages, `dark:bg-slate-950`.
- **Surfaces/Cards**: `bg-white` with `border-slate-100` (`dark:bg-slate-900 dark:border-slate-800`).
- **Primary Action (Teal/Emerald)**: `bg-teal-600` or `bg-emerald-600` for primary buttons/accents.
- **Typography**:
  - Primary text/Headings: `text-slate-900` (`dark:text-white`).
  - Secondary/Overlines: `text-slate-400` or `text-slate-500`.
- **Soft Accents (Icon Wrappers)**: Use tinted background with matching text (e.g., `bg-indigo-50 text-indigo-600 border-indigo-100/50`, `bg-amber-50 text-amber-600 border-amber-100/50`).

### 2. Layout & Typography
- **Families**: 
  - **Headings & Main UI**: `Poppins`, sans-serif (Weights: 500, 600, 700, 800, 900 `font-black`).
  - **Body / Supporting**: `Roboto` or `Inter`, sans-serif.
- **Micro-labels (Overlines)**: `text-[10px] font-black uppercase tracking-[0.2em] (tracking-widest) text-slate-400`.
- **Headers (Large)**: `text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight`.

### 3. Component Patterns (Dashboard Standard)

#### Cards & Containers
- **Dashboard Card Base**: `bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden`.
- **Card Accent Concept**: Cards should include a top-right corner background decorative shape:
  `<div className="absolute top-0 right-0 h-24 w-24 bg-{color}-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />`
- **Icon Boxes**: Icons inside cards should be wrapped in squarish boxes: `shrink-0 p-3 bg-{color}-50 rounded-2xl text-{color}-600 border border-{color}-100/50`.

#### Buttons & Inputs
- **Primary Button**: `inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-teal-500 hover:shadow-md hover:-translate-y-0.5`.
- **Secondary Button**: `bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100`.

#### Alerts & Info Banners
- **Style**: `inline-flex items-center gap-4 p-4 pr-6 rounded-2xl bg-amber-50 border border-amber-100/50 shadow-sm`.

#### Data Tables (e.g., AdminCourses)
- **Header**: `bg-[#0d4a8f] text-white font-[600]`.
- **Rows**: Odd (`#ffffff`), Even (`#f5f5f5`), Hover (`#e0e0e0`).
- **Borders**: `1px solid #cccccc`.

### 4. Navigation
- **Navbar**: `bg-[#0d4a8f] text-[#ffffff] font-Poppins font-medium`. Link hover: `#ffc20e`.
- **Sidebar (Admin)**: `bg-[#f5f5f5]`. Active link: `#0d4a8f` (bold). Hover: `#e0e0e0`.
- **Breadcrumbs**: Text `#666666`, Separator `>`, Hover `#0d4a8f`.

### 5. Alerts & Notifications
- **Success**: `bg-[#eafaf1] text-[#27ae60]`.
- **Error**: `bg-[#fdecea] text-[#e74c3c]`.
- **Warning**: `bg-[#fff4e5] text-[#ffc20e]`.
- **Info**: `bg-[#e6f2fa] text-[#0d4a8f]`.
- **Style**: Padding `12px 20px`, rounded `6px`, icon left-aligned.

## Implementation Checklist
1. **Fonts**: Ensure `Poppins` and `Roboto` are imported via Google Fonts or local assets.
2. **Icons**: Use Line icons / Minimalist style (Feather or FontAwesome). Size: 16px (default), 20px (action).
3. **Responsiveness**: Desktop-first, adaptive for tablet/mobile.
4. **Dark Mode**: *Deprecated/Secondary* based on new guidelines (Primary is White/Light Gray).

## Reusable Components
- `components/Sidebar.tsx`: Navigation usage.
- `components/Header.tsx`: Title and User menu.
- `pages/AdminCourses.tsx`: Reference implementation for Toolbar + Table layout.
