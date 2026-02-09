import { Router } from "express";
import { query } from "../db.js";
import { validateProjectInput } from "../validators.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const validation = validateProjectInput(req.body);
    if (validation.errors) {
      return res.status(400).json({ errors: validation.errors });
    }

    const { name, clientName, estimatedBudget } = validation.data!;
    const result = await query<{
      id: string;
      name: string;
      client_name: string;
      estimated_budget: string;
      status: string;
      created_at: string;
    }>(
      `INSERT INTO projects (name, client_name, estimated_budget)
       VALUES ($1, $2, $3)
       RETURNING id, name, client_name, estimated_budget, status, created_at`,
      [name, clientName, estimatedBudget]
    );

    return res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      clientName: result.rows[0].client_name,
      estimatedBudget: Number(result.rows[0].estimated_budget),
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (_req, res, next) => {
  try {
    const result = await query<{
      id: string;
      name: string;
      client_name: string;
      estimated_budget: string;
      status: string;
      created_at: string;
      total_expenses: string;
      remaining_budget: string;
    }>(
      `SELECT p.id,
              p.name,
              p.client_name,
              p.estimated_budget,
              p.status,
              p.created_at,
              COALESCE(SUM(e.amount), 0) AS total_expenses,
              p.estimated_budget - COALESCE(SUM(e.amount), 0) AS remaining_budget
       FROM projects p
       LEFT JOIN expenses e ON e.project_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );

    const projects = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      clientName: row.client_name,
      estimatedBudget: Number(row.estimated_budget),
      status: row.status,
      createdAt: row.created_at,
      totalExpenses: Number(row.total_expenses),
      remainingBudget: Number(row.remaining_budget),
    }));

    return res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const projectResult = await query<{
      id: string;
      name: string;
      client_name: string;
      estimated_budget: string;
      status: string;
      created_at: string;
    }>(
      `SELECT id, name, client_name, estimated_budget, status, created_at
       FROM projects
       WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found." });
    }

    const expensesResult = await query<{
      id: string;
      description: string;
      category: string;
      amount: string;
      created_at: string;
    }>(
      `SELECT id, description, category, amount, created_at
       FROM expenses
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );

    const project = projectResult.rows[0];
    return res.json({
      id: project.id,
      name: project.name,
      clientName: project.client_name,
      estimatedBudget: Number(project.estimated_budget),
      status: project.status,
      createdAt: project.created_at,
      expenses: expensesResult.rows.map((expense) => ({
        id: expense.id,
        description: expense.description,
        category: expense.category,
        amount: Number(expense.amount),
        createdAt: expense.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
