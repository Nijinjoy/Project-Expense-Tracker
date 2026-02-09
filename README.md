# Projects & Expenses Tracker

Internal tool for construction and interior design teams to track project budgets and expenses.

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 16+

### Backend
```bash
cd server
npm install
export DATABASE_URL="postgres://<user>@localhost:5432/project_expenses"
psql "$DATABASE_URL" -f src/schema.sql
npm run dev
```
The API runs on `http://localhost:4000`.

### Frontend
```bash
cd ..
npm install
npm run dev
```
The web app runs on `http://localhost:3000`.

Optional: point the frontend at a different API base URL:
```bash
export NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Database Schema Explanation

### `projects`
- `id` (UUID, PK)
- `name` (text, required)
- `client_name` (text, required)
- `estimated_budget` (numeric, non-negative)
- `status` (text, default `Planning`)
- `created_at` (timestamp)

### `expenses`
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects.id, on delete cascade)
- `description` (text, required)
- `category` (text enum: `material`, `labor`, `other`)
- `amount` (numeric, non-negative)
- `created_at` (timestamp)

Each project can have many expenses. Deleting a project deletes its expenses.

## Assumptions
- Currency display is AED (UI formatting only).
- Authentication/authorization is not required for this internal MVP.
- Budget totals in the UI are derived from `GET /projects` and updated optimistically after add/edit/delete.
- Expense categories are limited to material/labor/other for consistency.

## Improvements With More Time
- Add authentication and role-based access.
- Move optimistic UI updates to a cache layer (SWR/React Query).
- Add pagination, filtering, and search for large project lists.
- Add audit logs (who changed what, when).
- Add tests for API routes and validation.
  
 <img width="1639" height="835" alt="Screenshot 2026-02-09 at 3 56 56 PM" src="https://github.com/user-attachments/assets/9d73f5a3-cf90-4ce9-ae6e-d17a06becabd" />

 <img width="1620" height="831" alt="Screenshot 2026-02-09 at 3 58 19 PM" src="https://github.com/user-attachments/assets/510d2f46-f906-4738-ad5c-e3c17347c67f" />

  <img width="1633" height="831" alt="Screenshot 2026-02-09 at 4 00 19 PM" src="https://github.com/user-attachments/assets/47969a4e-a809-4eda-a3ac-a1e42dc57a3b" />


