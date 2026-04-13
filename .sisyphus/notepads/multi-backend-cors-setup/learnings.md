## 2026-04-12 Task: Multi-Backend CORS Setup Implementation

### Completed Steps
1. **vite.config.ts** - Added `/spring-api` proxy rule targeting `http://localhost:8090` with rewrite
2. **lib/apiBase.ts** - Added `SPRING_API_BASE_URL` following same pattern as `API_BASE_URL`
3. **lib/api.ts** - 
   - Added `backend` option to `RequestOptions` type
   - Updated `request()` function with backend routing logic
   - Updated `requestBlob()` function with backend routing logic  
   - Updated `registerStudent` to use `backend: "spring"`
   - Updated `getRegistrationWindowSettings` to use `backend: "spring"`
   - Updated `shouldAutoLogout()` to exclude Spring Boot public endpoints
   - Fixed AI chat functions to use `API_BASE_URL` instead of removed `API_BASE` constant
4. **.env.example** - Created with both `VITE_API_BASE_URL` and `VITE_SPRING_API_BASE_URL`

### Key Decisions
- Dev mode: requests go through Vite proxy (base URL empty)
- Production mode: base URL contains full URL, no proxy prefix added
- `shouldAutoLogout` matches raw path not proxy path (prefix added inside request())

### Verification
- Build passes: `npm run build` successful
- All TypeScript compiles without errors

### Remaining (Manual/External)
- Step 6: Spring Boot CORS configuration (outside this repo)
- Step 7: FastAPI CORS verification (outside this repo)
- Step 9: End-to-End manual testing