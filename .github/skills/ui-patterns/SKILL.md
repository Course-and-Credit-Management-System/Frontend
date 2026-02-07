---
name: ui-patterns
description: Guidelines for maintaining a consistent UI/UX across the UniPortal application using Tailwind CSS and React component patterns.
---

# UI Patterns & Design System: UniPortal

This skill defines the visual language and component architecture for the application. Use it to ensure consistency in layouts, color usage, and interactive elements.

## Core Design Principles

### 1. Color System (Tailwind)
The application relies on a specifc color palette defined by the brand guidelines.
- **Primary Blue**: `#0d4a8f` (Navbar, primary buttons, highlights).
- **Secondary Blue**: `#1e73be` (Hover states, accents).
- **Accent Yellow**: `#ffc20e` (Notifications, alerts, highlights).
- **Neutrals**:
  - Backgrounds: `#f5f5f5` (Light Gray/Sections), `#ffffff` (White/Main).
  - Text: `#333333` (Dark Gray/Primary), `#666666` (Medium Gray/Secondary).
- **Status Indicators**:
  - **Success**: `#27ae60` (Green).
  - **Error**: `#e74c3c` (Red).

### 2. Layout & Typography
- **Families**: 
  - **Headings**: `Poppins`, sans-serif (Weights: 500, 600, 700).
  - **Body**: `Roboto`, sans-serif (Size: 16px, Weight: 400).
- **Grid**: Max-width `1200px` (centered), 12-column grid, 20px gutters.
- **Spacing**:
  - Sections: 40px vertical padding.
  - Components: Small (8px), Medium (16px), Large (32px).

### 3. Component Patterns

#### Buttons
- **Primary**: `bg-[#0d4a8f] text-white rounded-[6px] hover:bg-[#1e73be] uppercase font-medium`.
- **Secondary**: `bg-white text-[#0d4a8f] border border-[#0d4a8f] rounded-[6px] hover:bg-[#e0e0e0]`.
- **Properties**: Padding `12px 24px`, subtle shadow `0 2px 4px rgba(0,0,0,0.1)`.

#### Forms & Inputs
- **Input Field**:
  - `bg-white border border-[#cccccc] rounded-[6px] p-[10px_12px]`.
  - Focus: Border `#0d4a8f`, Shadow `0 0 0 2px rgba(13,74,143,0.2)`.
- **Labels**: `text-[14px] text-[#333333] font-medium`.
- **Dropdowns**: `bg-white border border-[#cccccc] rounded-[6px] hover:bg-[#f5f5f5]`.

#### Cards & Containers
- **Style**: `bg-white rounded-[8px] p-[20px] shadow-[0_2px_6px_rgba(0,0,0,0.1)]`.
- **Content**: Title H3 (`#333333`), Body text (`#666666`).
- **Dashboard Widgets**: 
  - Module tiles (Enrollment, Results, Status, Timetable) should use white backgrounds with centralized icons and bold Poppins titles.

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
