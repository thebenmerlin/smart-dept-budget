import { z } from 'zod';

export const budgetSchema = z.object({
  department_id: z.number().int(),
  fiscal_year: z.string().min(4),
  proposed_amount: z.number().nonnegative(),
  allotted_amount: z.number().nonnegative(),
  notes: z.string().optional()
});

export const expenseSchema = z.object({
  department_id: z.number().int(),
  category_id: z.number().int(),
  event_id: z.number().int().nullable().optional(),
  amount: z.number().positive(),
  vendor: z.string().min(1),
  expense_date: z.string().date(),
  description: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  receipts: z.array(z.object({
    url: z.string().url(),
    public_id: z.string(),
    mime_type: z.string(),
    size_bytes: z.number().int().nonnegative()
  })).optional()
});

export const filtersSchema = z.object({
  category: z.string().optional(),
  vendor: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  status: z.string().optional()
});