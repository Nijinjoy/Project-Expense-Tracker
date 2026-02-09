"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  clientName: string;
  estimatedBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  status: string;
  createdAt: string;
  expenses?: Expense[];
};

type ApiProject = {
  id: string;
  name: string;
  clientName: string;
  estimatedBudget: number;
  status: string;
  createdAt: string;
  totalExpenses: number;
  remainingBudget: number;
};

type ApiExpense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  createdAt: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);

const formatCategory = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const request = async <T,>(path: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload?.error ||
      payload?.errors?.join(" ") ||
      `Request failed with ${response.status}.`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
};

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newProject, setNewProject] = useState({
    name: "",
    clientName: "",
    estimatedBudget: "",
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDraft, setExpenseDraft] = useState({
    description: "",
    category: "material",
    amount: "",
  });
  const [newExpense, setNewExpense] = useState({
    description: "",
    category: "material",
    amount: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await request<{ projects: ApiProject[] }>("/projects");
        setProjects((prev) => {
          const prevMap = new Map(prev.map((project) => [project.id, project]));
          return data.projects.map((project) => ({
            ...project,
            expenses: prevMap.get(project.id)?.expenses,
          }));
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summary = useMemo(() => {
    const budget = projects.reduce(
      (sum, project) => sum + project.estimatedBudget,
      0
    );
    const spent = projects.reduce(
      (sum, project) => sum + project.totalExpenses,
      0
    );
    return {
      budget,
      spent,
      remaining: budget - spent,
    };
  }, [projects]);

  const fetchProjectDetails = async (projectId: string) => {
    const data = await request<{
      id: string;
      expenses: ApiExpense[];
    }>(`/projects/${projectId}`);

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, expenses: data.expenses }
          : project
      )
    );
  };

  
  const handleToggleExpand = async (projectId: string) => {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
    const current = projects.find((project) => project.id === projectId);
    if (current && !current.expenses) {
      try {
        await fetchProjectDetails(projectId);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load project expenses."
        );
      }
    }
  };

  const handleAddProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const budget = Number(newProject.estimatedBudget);
    if (!newProject.name || !newProject.clientName || Number.isNaN(budget)) {
      setError("Please fill in all project fields.");
      return;
    }

    try {
      const created = await request<ApiProject>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProject.name,
          clientName: newProject.clientName,
          estimatedBudget: budget,
        }),
      });
      console.log("Project created:", created);

      const newEntry: Project = {
        ...created,
        totalExpenses: 0,
        remainingBudget: created.estimatedBudget,
        expenses: [],
      };

      setProjects((prev) => [newEntry, ...prev]);
      setExpandedProjectId(newEntry.id);
      setNewProject({ name: "", clientName: "", estimatedBudget: "" });
      setIsProjectModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project.");
    }
  };

  const handleAddExpense = async (
    event: React.FormEvent<HTMLFormElement>,
    projectId: string
  ) => {
    event.preventDefault();
    setError(null);

    const amount = Number(newExpense.amount);
    if (!newExpense.description || Number.isNaN(amount)) {
      setError("Please enter a description and amount.");
      return;
    }

    try {
      const created = await request<ApiExpense>(
        `/projects/${projectId}/expenses`,
        {
          method: "POST",
          body: JSON.stringify({
            description: newExpense.description,
            amount,
            category: newExpense.category,
          }),
        }
      );
      console.log("Expense created:", created);

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) {
            return project;
          }

          const updatedExpenses = project.expenses
            ? [created, ...project.expenses]
            : [created];

          return {
            ...project,
            expenses: updatedExpenses,
            totalExpenses: project.totalExpenses + created.amount,
            remainingBudget: project.remainingBudget - created.amount,
          };
        })
      );

      setNewExpense({ description: "", category: "material", amount: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense.");
    }
  };

  const handleStartEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseDraft({
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
    });
  };

  const handleSaveEdit = async (projectId: string) => {
    if (!editingExpenseId) {
      return;
    }

    const amount = Number(expenseDraft.amount);
    if (!expenseDraft.description || Number.isNaN(amount)) {
      setError("Please fill in all expense fields.");
      return;
    }

    try {
      const updated = await request<ApiExpense>(
        `/expenses/${editingExpenseId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            description: expenseDraft.description,
            amount,
            category: expenseDraft.category,
          }),
        }
      );
      console.log("Expense updated:", updated);

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId || !project.expenses) {
            return project;
          }

          const existing = project.expenses.find(
            (expense) => expense.id === editingExpenseId
          );
          const delta = existing ? updated.amount - existing.amount : 0;

          return {
            ...project,
            expenses: project.expenses.map((expense) =>
              expense.id === editingExpenseId ? updated : expense
            ),
            totalExpenses: project.totalExpenses + delta,
            remainingBudget: project.remainingBudget - delta,
          };
        })
      );

      setEditingExpenseId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update expense.");
    }
  };

  const handleDeleteExpense = async (projectId: string, expenseId: string) => {
    setError(null);

    try {
      await request(`/expenses/${expenseId}`, { method: "DELETE" });
      console.log("Expense deleted:", expenseId);

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId || !project.expenses) {
            return project;
          }

          const existing = project.expenses.find(
            (expense) => expense.id === expenseId
          );
          const amount = existing?.amount ?? 0;

          return {
            ...project,
            expenses: project.expenses.filter(
              (expense) => expense.id !== expenseId
            ),
            totalExpenses: project.totalExpenses - amount,
            remainingBudget: project.remainingBudget + amount,
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense.");
    }
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
  };

  return (
    <div className="min-h-screen px-6 py-10 sm:px-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 animate-[rise_700ms_ease-out]">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.45em] text-[var(--ink-2)]">
              Crestline construction & interiors
            </p>
            <h1 className="mt-4 text-4xl font-[var(--font-display)] text-[var(--ink-0)] sm:text-5xl">
              Projects + expenses tracker
            </h1>
            <p className="mt-4 text-lg text-[var(--ink-1)]">
              Track each job’s budget, total spend, and remaining funds with a
              single internal dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="rounded-full bg-[var(--accent-0)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              New project
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-3xl border border-[var(--line)] bg-white px-5 py-3 text-sm text-[var(--accent-0)]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Total budget",
              value: formatCurrency(summary.budget),
            },
            {
              label: "Total spent",
              value: formatCurrency(summary.spent),
            },
            {
              label: "Remaining",
              value: formatCurrency(summary.remaining),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border border-[var(--line)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-soft)]"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-2)]">
                {card.label}
              </p>
              <p className="mt-4 text-3xl font-semibold text-[var(--ink-0)]">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-[var(--font-display)] text-[var(--ink-0)]">
                Projects
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                Expand a project to review expenses and adjustments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-1)] transition hover:border-[var(--accent-0)] hover:text-[var(--ink-0)]"
            >
              Add project
            </button>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--ink-2)]">
              Loading projects...
            </div>
          ) : null}

          {!loading && projects.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--ink-2)]">
              No projects yet. Add your first project to get started.
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-4">
            {projects.map((project) => {
              const used =
                project.estimatedBudget === 0
                  ? 0
                  : Math.min(
                      100,
                      Math.round(
                        (project.totalExpenses / project.estimatedBudget) * 100
                      )
                    );
              const isExpanded = project.id === expandedProjectId;
              return (
                <div
                  key={project.id}
                  className="rounded-2xl border border-[var(--line)] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(project.id)}
                    className="flex w-full flex-col gap-4 rounded-2xl px-5 py-4 text-left transition hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--ink-0)]">
                          {project.name}
                        </p>
                        <p className="text-sm text-[var(--ink-2)]">
                          {project.clientName}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-2)]">
                        {project.status}
                      </span>
                    </div>
                    <div className="grid gap-3 text-sm text-[var(--ink-2)] sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em]">
                          Estimated budget
                        </p>
                        <p className="mt-1 text-base font-semibold text-[var(--ink-0)]">
                          {formatCurrency(project.estimatedBudget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em]">
                          Total expenses
                        </p>
                        <p className="mt-1 text-base font-semibold text-[var(--ink-0)]">
                          {formatCurrency(project.totalExpenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em]">
                          Remaining budget
                        </p>
                        <p className="mt-1 text-base font-semibold text-[var(--ink-0)]">
                          {formatCurrency(project.remainingBudget)}
                        </p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--line)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent-0)]"
                        style={{ width: `${used}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--ink-2)]">
                      <span>{used}% used</span>
                      <span>
                        {project.expenses?.length ?? 0} expense
                        {(project.expenses?.length ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-[var(--line)] px-5 py-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-[var(--ink-0)]">
                          Project expenses
                        </h3>
                        <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-2)]">
                          {project.expenses?.length ?? 0} items
                        </span>
                      </div>
                      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-2)]">
                          Budget summary
                        </p>
                        <div className="mt-3 grid gap-3 text-sm text-[var(--ink-2)] sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]">
                              Estimated budget
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink-0)]">
                              {formatCurrency(project.estimatedBudget)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]">
                              Total expenses
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink-0)]">
                              {formatCurrency(project.totalExpenses)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]">
                              Remaining budget
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink-0)]">
                              {formatCurrency(project.remainingBudget)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <form
                        onSubmit={(event) => handleAddExpense(event, project.id)}
                        className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold text-[var(--ink-0)]">
                              Add expense
                            </h4>
                            <p className="text-xs text-[var(--ink-2)]">
                              Log materials, labor, or other spend.
                            </p>
                          </div>
                          <button
                            type="submit"
                            className="rounded-full bg-[var(--accent-0)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5"
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <input
                            value={newExpense.description}
                            onChange={(event) =>
                              setNewExpense((prev) => ({
                                ...prev,
                                description: event.target.value,
                              }))
                            }
                            placeholder="Description"
                            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)] sm:col-span-2"
                          />
                          <input
                            value={newExpense.amount}
                            onChange={(event) =>
                              setNewExpense((prev) => ({
                                ...prev,
                                amount: event.target.value,
                              }))
                            }
                            placeholder="Amount"
                            type="number"
                            min="0"
                            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
                          />
                          <select
                            value={newExpense.category}
                            onChange={(event) =>
                              setNewExpense((prev) => ({
                                ...prev,
                                category: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
                          >
                            <option value="material">Material</option>
                            <option value="labor">Labor</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </form>
                      <div className="mt-4 flex flex-col gap-3">
                        {(project.expenses ?? []).map((expense) => {
                          const isEditing = editingExpenseId === expense.id;
                          return (
                            <div
                              key={expense.id}
                              className="rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4"
                            >
                              {isEditing ? (
                                <div className="grid gap-3">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <input
                                      value={expenseDraft.description}
                                      onChange={(event) =>
                                        setExpenseDraft((prev) => ({
                                          ...prev,
                                          description: event.target.value,
                                        }))
                                      }
                                      className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
                                    />
                                    <select
                                      value={expenseDraft.category}
                                      onChange={(event) =>
                                        setExpenseDraft((prev) => ({
                                          ...prev,
                                          category: event.target.value,
                                        }))
                                      }
                                      className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
                                    >
                                      <option value="material">Material</option>
                                      <option value="labor">Labor</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  <input
                                    value={expenseDraft.amount}
                                    onChange={(event) =>
                                      setExpenseDraft((prev) => ({
                                        ...prev,
                                        amount: event.target.value,
                                      }))
                                    }
                                    type="number"
                                    min="0"
                                    className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(project.id)}
                                      className="rounded-full bg-[var(--accent-0)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-2)]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-base font-semibold text-[var(--ink-0)]">
                                      {expense.description}
                                    </p>
                                    <p className="text-sm text-[var(--ink-2)]">
                                      {formatCategory(expense.category)}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-lg font-semibold text-[var(--ink-0)]">
                                      {formatCurrency(expense.amount)}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(expense)}
                                      className="rounded-full border border-[var(--line)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-2)] transition hover:border-[var(--accent-0)]"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteExpense(project.id, expense.id)
                                      }
                                      className="rounded-full border border-transparent bg-[var(--surface-2)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-2)] transition hover:text-[var(--ink-0)]"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(project.expenses ?? []).length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--ink-2)]">
                            No expenses logged for this project yet.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {isProjectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsProjectModalOpen(false)}
          />
          <form
            onSubmit={handleAddProject}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-[var(--font-display)] text-[var(--ink-0)]">
                Add project
              </h3>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="rounded-full border border-[var(--line)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-2)]"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--ink-2)]">
              Capture the client and an initial budget estimate.
            </p>
            <div className="mt-5 grid gap-4">
              <input
                value={newProject.name}
                onChange={(event) =>
                  setNewProject((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Project name"
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
              />
              <input
                value={newProject.clientName}
                onChange={(event) =>
                  setNewProject((prev) => ({
                    ...prev,
                    clientName: event.target.value,
                  }))
                }
                placeholder="Client name"
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
              />
              <input
                value={newProject.estimatedBudget}
                onChange={(event) =>
                  setNewProject((prev) => ({
                    ...prev,
                    estimatedBudget: event.target.value,
                  }))
                }
                placeholder="Estimated budget (USD)"
                type="number"
                min="0"
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink-0)] outline-none transition focus:border-[var(--accent-0)]"
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-[var(--accent-0)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5"
              >
                Save project
              </button>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-2)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
