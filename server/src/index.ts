import "dotenv/config";
import cors from "cors";
import express from "express";
import projectsRouter from "./routes/projects.js";
import expensesRouter from "./routes/expenses.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/projects", projectsRouter);
app.use("/", expensesRouter);

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(500).json({ error: error.message || "Server error." });
  }
);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
});
