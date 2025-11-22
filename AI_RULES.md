# AI Rules for Rack Operation System

This document outlines the core technologies and libraries used in this project, along with guidelines for their usage. Adhering to these rules ensures consistency, maintainability, and leverages the strengths of our chosen stack.

## Tech Stack Overview

*   **Frontend Framework**: React
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **UI Components**: shadcn/ui (built on Radix UI)
*   **Routing**: React Router
*   **Data Fetching & State Management**: React Query
*   **Icons**: Lucide React
*   **Database & Authentication**: Supabase
*   **Form Management**: React Hook Form with Zod for validation
*   **Notifications**: Sonner for toast messages
*   **Date Utilities**: date-fns
*   **Excel Operations**: xlsx
*   **Charting**: Recharts

## Library Usage Rules

To maintain a consistent and efficient codebase, please follow these guidelines when implementing new features or modifying existing ones:

*   **UI Components**: Always prioritize using components from `shadcn/ui`. If a required component is not available in `shadcn/ui`, create a new, small, and focused component using Tailwind CSS for styling and Radix UI primitives if necessary. **Do not modify existing `shadcn/ui` component files.**
*   **Styling**: All styling must be done using **Tailwind CSS** classes. Avoid inline styles or custom CSS files unless absolutely necessary for global styles defined in `src/index.css`.
*   **Routing**: Use **React Router** (`react-router-dom`) for all client-side navigation. Keep route definitions centralized in `src/App.tsx`.
*   **Data Fetching**: For all server-side data interactions (fetching, mutations, caching), use **React Query** (`@tanstack/react-query`).
*   **Icons**: Use icons from the **Lucide React** library (`lucide-react`).
*   **Database Interactions**: All interactions with the database (CRUD operations, authentication) must be performed using the **Supabase client** (`@supabase/supabase-js`).
*   **Form Handling**: Implement forms using **React Hook Form** for state management and validation. Use **Zod** for defining form schemas and validation rules.
*   **Notifications**: For displaying user feedback messages (e.g., success, error, info), use the **Sonner** toast library.
*   **Date & Time**: For any date parsing, formatting, or manipulation, use the **date-fns** library.
*   **Excel Import/Export**: When dealing with Excel files (e.g., importing BOM data), use the **xlsx** library.
*   **Charting & Data Visualization**: For creating charts and graphs, use the **Recharts** library.