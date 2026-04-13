# Cognantic – Frontend (React + TypeScript)

Science-based mental health platform UI. Built with **React 18 + TypeScript + Vite**.

---

## Project Structure

```
src/
├── App.tsx                  # Root component, view routing, auth state
├── main.tsx                 # Vite entry point
├── components/
│   ├── Header.tsx           # Fixed nav with Cognantic logo + nav pills
│   ├── AuthModal.tsx        # Login / Register / Forgot Password modal
│   ├── LoadingSpinner.tsx   # Reusable loading indicator
│   ├── EmptyState.tsx       # Reusable empty-state placeholder
│   └── Toast.tsx            # Toast notification component
├── pages/
│   ├── HomePage.tsx         # Landing: hero, portal cards, stats, philosophy
│   ├── PatientPage.tsx      # Dashboard + 5-step intake/booking flow
│   ├── TherapistPage.tsx    # Schedule planner, patient requests, earnings
│   └── AdminPage.tsx        # Vetting pipeline, performance, audit log
├── hooks/
│   ├── useAuth.ts           # Login / register / logout state
│   ├── useApi.ts            # Generic data-fetching hook
│   └── index.ts
├── services/
│   └── api.ts               # Full API client (auth, patient, therapist, admin, matching)
├── types/
│   └── index.ts             # All shared TypeScript interfaces
└── styles/
    └── global.css           # Design tokens, utilities, component base styles
```

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Edit VITE_API_URL to point at your .NET backend
```

### 3. Run dev server
```bash
npm run dev
# → http://localhost:5173
```

### 4. Build for production
```bash
npm run build
# Output in /dist
```

---

## Brand Colors

| Token          | Hex       | Usage                        |
|----------------|-----------|------------------------------|
| `--forest`     | `#39786A` | Primary CTA, active states   |
| `--sage`       | `#9AA57B` | Accents, borders, badges     |
| `--sage-light` | `#D6EEF0` | Light backgrounds            |
| `--cream`      | `#DFD8BE` | Warm surface tones           |
| `--cream-bg`   | `#F7F6F2` | Page background              |
| `--charcoal`   | `#1C1C1E` | Primary text, dark cards     |

Typography: **Sora** (body) + **DM Serif Display** (headings/display)

---

## Connecting to .NET Backend

All API calls route through `src/services/api.ts`. The service layer is organised into:

- `authApi`      → `/api/auth/*`
- `patientApi`   → `/api/patients/*` + `/api/sessions/*`
- `therapistApi` → `/api/therapists/*`
- `adminApi`     → `/api/admin/*`
- `matchingApi`  → `/api/matching/*`

The `useAuth` hook manages JWT token storage and provides `login`, `register`, `logout`, and `forgotPassword` methods ready to wire into the `AuthModal`.

The `useApi<T>` hook handles loading/error/data state for any endpoint.

---

## Pages

| Route (view state) | Page            | Access        |
|--------------------|-----------------|---------------|
| `home`             | `HomePage`      | Public        |
| `patient`          | `PatientPage`   | Patient auth  |
| `therapist`        | `TherapistPage` | Therapist auth|
| `admin`            | `AdminPage`     | Admin auth    |

Routing is handled via a `view` state in `App.tsx`. Replace with **React Router** when wiring up real auth guards.

---

## Next Steps (Backend Integration)

1. **Replace `alert()` calls** in `PatientPage`, `TherapistPage`, `AdminPage` with real API calls from `src/services/api.ts`
2. **Wire `useAuth`** into `AuthModal.tsx` — replace the `setTimeout` mock with real `login()` / `register()` calls
3. **Add React Router** for deep-linking and protected route guards
4. **Add context / Zustand** for global auth state so all pages can access the current user
5. **Implement real file downloads** (Care Plan PDF, Earnings Report) via the Blob API handlers in `patientApi` and `therapistApi`
