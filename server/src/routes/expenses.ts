import { Router } from "express";
import { query } from "../db.js";
import { validateExpenseInput, validateExpensePatch } from "../validators.js";

const router = Router();

router.post("/projects/:projectId/expenses", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const validation = validateExpenseInput(req.body);
    if (validation.errors) {
      return res.status(400).json({ errors: validation.errors });
    }

    const projectResult = await query("SELECT id FROM projects WHERE id = $1", [
      projectId,
    ]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found." });
    }

    const { description, amount, category } = validation.data!;
    const result = await query<{
      id: string;
      description: string;
      category: string;
      amount: string;
      created_at: string;
    }>(
      `INSERT INTO expenses (project_id, description, category, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id, description, category, amount, created_at`,
      [projectId, description, category, amount]
    );

    return res.status(201).json({
      id: result.rows[0].id,
      description: result.rows[0].description,
      category: result.rows[0].category,
      amount: Number(result.rows[0].amount),
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:projectId/expenses", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const projectResult = await query("SELECT id FROM projects WHERE id = $1", [
      projectId,
    ]);
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

    return res.json({
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

router.patch("/expenses/:expenseId", async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const validation = validateExpensePatch(req.body);
    if (validation.errors) {
      return res.status(400).json({ errors: validation.errors });
    }

    const existingResult = await query<{
      id: string;
      description: string;
      category: string;
      amount: string;
      created_at: string;
    }>(
      `SELECT id, description, category, amount, created_at
       FROM expenses
       WHERE id = $1`,
      [expenseId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found." });
    }

    const updates = validation.data!;
    const updated = {
      ...existingResult.rows[0],
      ...updates,
    };

    const result = await query<{
      id: string;
      description: string;
      category: string;
      amount: string;
      created_at: string;
    }>(
      `UPDATE expenses
       SET description = $1,
           category = $2,
           amount = $3
       WHERE id = $4
       RETURNING id, description, category, amount, created_at`,
      [
        updated.description,
        updated.category,
        updates.amount ?? Number(updated.amount),
        expenseId,
      ]
    );

    return res.json({
      id: result.rows[0].id,
      description: result.rows[0].description,
      category: result.rows[0].category,
      amount: Number(result.rows[0].amount),
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/expenses/:expenseId", async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const result = await query("DELETE FROM expenses WHERE id = $1", [
      expenseId,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Expense not found." });
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
