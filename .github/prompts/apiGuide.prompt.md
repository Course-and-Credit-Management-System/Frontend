# Plan: API Layer Enhancement

This plan proposes two stages of improvement: Refining the current implementation for immediate type safety, and Transitioning to Industry Standards for better performance and developer experience.

## Analysis of Current Method
- **Pros**: Lightweight, zero dependencies, centralized logic for headers and base URL.
- **Cons**: 
  - **Type Safety**: Methods return `any`, losing TypeScript's benefits.
  - **Boilerplate**: Components manually manage `loading`, `error`, and `useEffect` for every call.
  - **Caching**: No built-in way to cache data or prevent duplicate requests.
  - **Interceptors**: Hard to handle global events (like redirecting to login on 401 Unauthorized).

---

## Phase 1: Refining lib/api.ts (Quick Wins)

I recommend updating [lib/api.ts](lib/api.ts) to support Generics and improve error handling.

### Steps
1. **Add Generics to `request`**: Modify `request` to be `async function request<T>(...)`, returning `Promise<T>`.
2. **Type the API Methods**: Update methods like `me()` to return `Promise<User>` and `login()` to return `Promise<LoginResponse>`.
3. **Enhance Error Handling**: Create a standardized `ApiError` class that captures status codes, allowing components to react to specific errors (e.g., 401 vs 500).
4. **Define Request/Response Types**: Ensure all data structures are defined in [types.ts](types.ts) and used in the API layer.

---

## Phase 2: Industry Standard Upgrade (Recommended)

For a growing application like "UniPortal", I suggest moving away from manual `useEffect` fetching.

### 1. TanStack Query (formerly React Query)
Instead of manual `loading`/`error` states in every component, use TanStack Query.
- **Why**: Automatically handles caching, background revalidation, and loading/error states.
- **Benefit**: Removes ~40% of boilerplate code in your pages.

### 2. Zod for Validation
Use `zod` to define schemas for your API responses.
- **Why**: TypeScript types only exist at compile time. Zod ensures the data actually matches your expectations at runtime.
- **Benefit**: Prevents "Cannot read property 'x' of undefined" if the backend schema changes slightly.

### 3. Request Interceptors
Create a cleaner interceptor system (can be done with native `fetch` or `axios`).
- **Use Case**: If the backend returns a `401`, the interceptor can automatically trigger `api.logout()` and redirect the user, rather than handling this in every single API call.

---

## Verification
- **Build Check**: Run `tsc` to ensure all API calls are correctly typed after adding generics.
- **Runtime Check**: Verify that `api.me()` in [App.tsx](App.tsx) correctly identifies the `User` object structure via IDE autocomplete.
- **Error Check**: Simulate a 500 error from the backend to ensure the custom error message is correctly surfaced to the UI.

## Decisions
- **Decision**: Recommended keeping the custom `fetch` wrapper for now but adding **Generics** immediately to leverage TypeScript.
- **Decision**: Suggested **TanStack Query** over manual state management because the workspace already has many pages that will eventually need complex data fetching/caching logic.
