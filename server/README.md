# Project Expenses Tracker API

## Setup
1) Create a PostgreSQL database and set `DATABASE_URL`.
2) Run the schema:
   `psql "$DATABASE_URL" -f src/schema.sql`
3) Install dependencies:
   `npm install`
4) Start the server:
   `npm run dev`

## Environment
- `DATABASE_URL` (required)
- `PORT` (optional, default: 4000)

## Endpoints
### Projects
- `POST /projects`
  - Body: `{ "name": "...", "clientName": "...", "estimatedBudget": 120000 }`
- `GET /projects`
- `GET /projects/:projectId`

### Expenses
- `POST /projects/:projectId/expenses`
  - Body: `{ "description": "...", "amount": 4500, "category": "material" }`
- `GET /projects/:projectId/expenses`
- `PATCH /expenses/:expenseId`
- `DELETE /expenses/:expenseId`
