type ValidationResult<T> = {
  data?: T;
  errors?: string[];
};

const isNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const parseAmount = (value: unknown) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
    return null;
  }
  return amount;
};

const normalizeCategory = (value: unknown) => {
  if (!isNonEmptyString(value)) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!["material", "labor", "other"].includes(normalized)) {
    return null;
  }
  return normalized;
};

export const validateProjectInput = (body: unknown) => {
  const payload = body as {
    name?: unknown;
    clientName?: unknown;
    estimatedBudget?: unknown;
  };

  const errors: string[] = [];

  if (!isNonEmptyString(payload?.name)) {
    errors.push("Project name is required.");
  }
  if (!isNonEmptyString(payload?.clientName)) {
    errors.push("Client name is required.");
  }

  const budget = parseAmount(payload?.estimatedBudget);
  if (budget === null) {
    errors.push("Estimated budget must be a non-negative number.");
  }

  if (errors.length > 0) {
    return { errors } as ValidationResult<never>;
  }

  return {
    data: {
      name: payload.name!.trim(),
      clientName: payload.clientName!.trim(),
      estimatedBudget: budget!,
    },
  } as ValidationResult<{
    name: string;
    clientName: string;
    estimatedBudget: number;
  }>;
};

export const validateExpenseInput = (body: unknown) => {
  const payload = body as {
    description?: unknown;
    amount?: unknown;
    category?: unknown;
  };

  const errors: string[] = [];

  if (!isNonEmptyString(payload?.description)) {
    errors.push("Expense description is required.");
  }

  const amount = parseAmount(payload?.amount);
  if (amount === null) {
    errors.push("Amount must be a non-negative number.");
  }

  const category = normalizeCategory(payload?.category);
  if (!category) {
    errors.push("Category must be material, labor, or other.");
  }

  if (errors.length > 0) {
    return { errors } as ValidationResult<never>;
  }

  return {
    data: {
      description: payload.description!.trim(),
      amount: amount!,
      category,
    },
  } as ValidationResult<{
    description: string;
    amount: number;
    category: string;
  }>;
};

export const validateExpensePatch = (body: unknown) => {
  const payload = body as {
    description?: unknown;
    amount?: unknown;
    category?: unknown;
  };

  const errors: string[] = [];
  const updates: {
    description?: string;
    amount?: number;
    category?: string;
  } = {};

  if (payload.description !== undefined) {
    if (!isNonEmptyString(payload.description)) {
      errors.push("Description must be a non-empty string.");
    } else {
      updates.description = payload.description.trim();
    }
  }

  if (payload.amount !== undefined) {
    const amount = parseAmount(payload.amount);
    if (amount === null) {
      errors.push("Amount must be a non-negative number.");
    } else {
      updates.amount = amount;
    }
  }

  if (payload.category !== undefined) {
    const category = normalizeCategory(payload.category);
    if (!category) {
      errors.push("Category must be material, labor, or other.");
    } else {
      updates.category = category;
    }
  }

  if (Object.keys(updates).length === 0) {
    errors.push("Provide at least one field to update.");
  }

  if (errors.length > 0) {
    return { errors } as ValidationResult<never>;
  }

  return { data: updates } as ValidationResult<typeof updates>;
};
