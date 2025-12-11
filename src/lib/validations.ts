import { z } from 'zod';

// Auth validations
export const loginSchema = z.object({
  email:  z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['admin', 'hod', 'staff']),
  department_id: z.number().int().positive(),
});

// Budget validations
export const budgetPlanSchema = z.object({
  category_id: z.number().int().positive('Category is required'),
  fiscal_year: z. string().regex(/^\d{4}-\d{2}$/, 'Invalid fiscal year format (e.g., 2024-25)'),
  proposed_amount: z.number().nonnegative('Amount must be non-negative'),
  justification: z.string().optional(),
});

export const budgetAllotmentSchema = z. object({
  category_id: z. number().int().positive('Category is required'),
  fiscal_year: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid fiscal year format'),
  allotted_amount: z. number().nonnegative('Amount must be non-negative'),
  notes: z.string().optional(),
});

// Expense validations
export const expenseSchema = z.object({
  category_id: z. number().int().positive('Category is required'),
  event_id: z.number().int().positive().nullable().optional(),
  amount: z.number().positive('Amount must be positive'),
  vendor:  z.string().min(1, 'Vendor is required').max(255),
  expense_date: z. string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  description: z.string().max(1000).optional(),
  invoice_number: z.string().max(100).optional(),
});

export const expenseApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
  rejection_reason: z.string().optional(),
}).refine(
  (data) => {
    // If status is rejected, require rejection_reason or notes
    if (data.status === 'rejected') {
      return (data.rejection_reason && data.rejection_reason.length > 0) || 
             (data.notes && data.notes.length > 0);
    }
    return true;
  },
  {
    message: 'Rejection reason or notes is required when rejecting an expense',
    path: ['rejection_reason'],
  }
);

// Filter validations
export const expenseFiltersSchema = z. object({
  category_id: z. number().int().positive().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  vendor: z.string().optional(),
  date_from: z. string().optional(),
  date_to:  z.string().optional(),
  event_id: z. number().int().positive().optional(),
});

// Report validations
export const reportFiltersSchema = z.object({
  type: z.enum(['monthly', 'category', 'budget', 'audit', 'vendor', 'expenses', 'summary']),
  fiscal_year: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  format: z.enum(['pdf', 'csv']).default('pdf'),
});

// Helper function to validate and parse
export function validateRequest<T>(schema: z.ZodSchema<T>, data:  unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(', ');
    return { success: false, error: errors };
  }
  
  return { success: true, data: result. data };
}