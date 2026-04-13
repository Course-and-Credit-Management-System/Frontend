# Work Plan: Multi-Backend CORS and Routing Setup

> **Status**: READY FOR REVIEW  
> **Generated**: 2026-04-12  
> **Metis Gap Analysis**: Completed — all critical gaps addressed  
> **Deferred**: JWT token compatibility across backends — not in scope for this plan

---

## Objective

Configure the UniPortal frontend to route API calls to the correct backend server (FastAPI or Spring Boot) using path-based Vite proxy routing, with production-ready environment variable fallbacks and proper CORS configuration on both backends.

## Architecture

```
Browser (localhost:3000)
  ├── /api/v1/...          → Vite Proxy → FastAPI (127.0.0.1:8000)
  └── /spring-api/api/v1/... → Vite Proxy → Spring Boot (localhost:8090)
                                  (rewrites /spring-api → empty)
```

**Production**:
```
Browser
  ├── /api/v1/...          → NGINX → FastAPI upstream
  └── /spring-api/api/v1/... → NGINX → Spring Boot upstream
```

---

## Step 1: Update Vite Proxy Configuration

**File**: `vite.config.ts`

**What**: Add a second proxy rule for Spring Boot with path rewriting.

**Change**:
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/spring-api': {
    target: 'http://localhost:8090',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/spring-api/, ''),
  },
},
```

**Why `rewrite`**: When the frontend sends `/spring-api/api/v1/students/register`, the rewrite strips `/spring-api` so Spring Boot receives `/api/v1/students/register` — matching its actual endpoint structure.

**Verification**: After saving, `npm run dev` should start without errors. No behavioral change yet since `lib/api.ts` still uses `/api` paths.

---

## Step 2: Add Spring Boot Base URL to Environment System

**File**: `lib/apiBase.ts`

**What**: Add a `SPRING_API_BASE_URL` constant alongside the existing `API_BASE_URL`, following the same loopback-detection pattern.

**Change**:
```typescript
const rawSpringApiBaseUrl = (import.meta.env.VITE_SPRING_API_BASE_URL || "").trim();

const isLoopbackSpringApiUrl = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(rawSpringApiBaseUrl);

export const SPRING_API_BASE_URL =
  rawSpringApiBaseUrl && !(import.meta.env.DEV && isLoopbackSpringApiUrl)
    ? rawSpringApiBaseUrl.replace(/\/$/, "")
    : "";
```

**Why**: In development, both base URLs are empty (requests go through Vite proxy). In production, `VITE_SPRING_API_BASE_URL` can point to the Spring Boot server or an NGINX path prefix.

**Verification**: TypeScript compiles without errors. `SPRING_API_BASE_URL` is `""` in dev mode.

---

## Step 3: Update `request()` and `requestBlob()` to Support Dual Backends

**File**: `lib/api.ts`

**What**: Add a `backend` option to `RequestOptions` so callers can specify which backend to target.

**Change**:
```typescript
type RequestOptions = {
  method?: string;
  body?: any;
  backend?: "fastapi" | "spring";  // NEW — defaults to "fastapi"
};
```

Update the `request<T>` function:
```typescript
async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const backend = options.backend ?? "fastapi";
  const base = backend === "spring" ? SPRING_API_BASE_URL : API_BASE;

  // In dev: base="" so we proxy through Vite. Prepend /spring-api so Vite catches it.
  // In prod: base has the full URL (e.g. https://spring.university.edu). No prefix needed.
  const proxyPrefix = backend === "spring" && !base ? "/spring-api" : "";
  const fullPath = `${proxyPrefix}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("access_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${fullPath}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // ... rest of existing logic unchanged ...
}
```

Also update `requestBlob()` with the same `backend` routing logic:
```typescript
async function requestBlob(path: string, options: RequestOptions = {}): Promise<BlobResponse> {
  const backend = options.backend ?? "fastapi";
  const base = backend === "spring" ? SPRING_API_BASE_URL : API_BASE;
  const proxyPrefix = backend === "spring" && !base ? "/spring-api" : "";
  const fullPath = `${proxyPrefix}${path}`;

  // ... rest of existing requestBlob logic unchanged, but use base + fullPath for fetch ...
  const res = await fetch(`${base}${fullPath}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  // ... unchanged ...
}
```

**Why**: This approach keeps the routing logic centralized. Callers just set `backend: "spring"` and the function handles the prefix and base URL automatically. The `/spring-api` proxy prefix is ONLY added when `base` is empty (dev mode via Vite proxy). In production, `base` contains the full URL so no prefix is needed — Spring Boot receives clean `/api/v1/...` paths. No scattered `/spring-api` strings across the codebase.

**Verification**: All existing calls (which default to `backend: "fastapi"`) continue to work identically. Production builds with `VITE_SPRING_API_BASE_URL` set will route directly without the proxy prefix.

---

## Step 4: Update Spring Boot API Methods in `api` Object

**File**: `lib/api.ts`

**What**: Change the two Spring Boot endpoints to use `backend: "spring"`.

**Change**:
```typescript
// Before:
registerStudent: (payload: any) => request("/api/v1/students/register", { method: "POST", body: payload }),
getRegistrationWindowSettings: () => request("/api/v1/settings/registration-window"),

// After:
registerStudent: (payload: any) => request("/api/v1/students/register", { method: "POST", body: payload, backend: "spring" }),
getRegistrationWindowSettings: () => request("/api/v1/settings/registration-window", { backend: "spring" }),
```

**Why**: The path stays as `/api/v1/...` (the `request()` function adds the `/spring-api` prefix automatically). This is clean and maintainable.

**Verification**: These two calls now route to Spring Boot. All other calls continue to route to FastAPI.

---

## Step 5: Update `shouldAutoLogout()` for Spring Boot Paths

**File**: `lib/api.ts`

**What**: Add exclusions for Spring Boot public endpoints that should not trigger auto-logout on 401/403.

**Change**:
```typescript
function shouldAutoLogout(path: string) {
  if (path === "/api/v1/auth/login") return false;
  if (path === "/api/v1/auth/me") return false;
  if (path === "/api/v1/auth/forgot-password") return false;
  if (path === "/api/v1/auth/reset-password-with-token") return false;
  if (path.includes("/api/v1/admin/messages/") && path.endsWith("/read")) return false;
  if (path.includes("/courses/enrollment")) return false;
  // Spring Boot public endpoints (match raw path — prefix is added inside request())
  if (path === "/api/v1/students/register") return false;
  if (path === "/api/v1/settings/registration-window") return false;
  return true;
}
```

**Why**: `registerStudent` is a public registration endpoint — a 401 there should not redirect to login. Same for the registration window settings (public info). NOTE: `shouldAutoLogout(path)` receives the **raw** path argument (e.g., `/api/v1/students/register`), NOT the proxy-rewritten path. The `/spring-api` prefix is only added inside `request()` when constructing the fetch URL, so exclusions must match the raw path.

**Verification**: Hitting Spring Boot endpoints with an expired token shows an error in the UI instead of redirecting to login.

---

## Step 6: Spring Boot CORS Configuration (Backend)

**What**: Add global CORS configuration in the Spring Boot application.

**File**: (Spring Boot backend — outside this repo)

**Change** (Java):
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:3000")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

**Why**: Even though Vite proxy bypasses CORS in dev, this is needed for:
- Direct browser access in testing
- Production deployment (if frontend and backend are on different origins)

**Verification**: A direct `curl -H "Origin: http://localhost:3000"` to Spring Boot returns proper CORS headers.

---

## Step 7: FastAPI CORS Verification (Backend)

**What**: Ensure FastAPI already has `CORSMiddleware` configured for `http://localhost:3000`.

**File**: (FastAPI backend — outside this repo)

**Change** (if not already present):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Why**: Same reasoning as Step 6.

**Verification**: Check existing FastAPI CORS config. If present and correct, no change needed.

---

## Step 8: Production Environment Template

**File**: `.env.example` (new file, or update existing)

**What**: Add documentation for the new env variable.

**Change**:
```env
# FastAPI backend (leave empty in dev to use Vite proxy)
VITE_API_BASE_URL=

# Spring Boot backend (leave empty in dev to use Vite proxy)
VITE_SPRING_API_BASE_URL=

# Production examples:
# VITE_API_BASE_URL=https://api.university.edu
# VITE_SPRING_API_BASE_URL=https://spring.university.edu
```

**Why**: Makes the dual-backend setup discoverable for deployment.

**Verification**: `.env.example` exists and documents both variables.

---

## Step 9: End-to-End Verification

**What**: Test the complete flow from frontend to both backends.

**Tests**:
1. `npm run dev` starts without errors
2. Login (FastAPI) works — existing functionality preserved
3. `POST /api/v1/students/register` routes to Spring Boot (check Spring Boot logs)
4. `GET /api/v1/settings/registration-window` routes to Spring Boot (check Spring Boot logs)
5. Other endpoints (courses, enrollments, etc.) still route to FastAPI
6. No TypeScript errors in `lib/api.ts` or `lib/apiBase.ts`

---

## Production Deployment Note

For production, configure the reverse proxy (NGINX, Caddy, etc.) to mirror the Vite proxy:

```nginx
location /api/ {
    proxy_pass http://fastapi_upstream;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /spring-api/ {
    proxy_pass http://springboot_upstream/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Set `VITE_API_BASE_URL` and `VITE_SPRING_API_BASE_URL` in the production build environment if the frontend is served from a different domain than the backends.

---

## Out of Scope

- Implementing Student Registration logic in Spring Boot
- WebSocket proxy configuration
- JWT/auth token handling across backends (deferred)
- Migration of additional endpoints from FastAPI to Spring Boot

---

## Files Modified (in this repo)

| File | Change Type |
|---|---|
| `vite.config.ts` | Add `/spring-api` proxy rule |
| `lib/apiBase.ts` | Add `SPRING_API_BASE_URL` export |
| `lib/api.ts` | Add `backend` option to `RequestOptions`; update 2 API methods; update `shouldAutoLogout` |
| `.env.example` | Add `VITE_SPRING_API_BASE_URL` documentation |

## Files Modified (outside this repo — backend)

| File | Change Type |
|---|---|
| Spring Boot `WebConfig.java` | Add CORS configuration |
| FastAPI `main.py` | Verify/fix CORSMiddleware |