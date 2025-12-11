import {
  expenseSchema,
  expenseApprovalSchema,
  reportFiltersSchema,
  validateRequest,
} from '../src/lib/validations';

describe('Expense Validations', () => {
  describe('expenseSchema', () => {
    it('should validate a valid expense', () => {
      const validExpense = {
        category_id: 1,
        event_id: 2,
        amount: 1000,
        vendor: 'Test Vendor',
        expense_date: '2024-01-15',
        description: 'Test expense',
        invoice_number: 'INV-001',
      };

      const result = validateRequest(expenseSchema, validExpense);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validExpense);
      }
    });

    it('should reject expense with negative amount', () => {
      const invalidExpense = {
        category_id: 1,
        amount: -100,
        vendor: 'Test Vendor',
        expense_date: '2024-01-15',
      };

      const result = validateRequest(expenseSchema, invalidExpense);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('positive');
      }
    });

    it('should reject expense with invalid date format', () => {
      const invalidExpense = {
        category_id: 1,
        amount: 100,
        vendor: 'Test Vendor',
        expense_date: '01/15/2024',
      };

      const result = validateRequest(expenseSchema, invalidExpense);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('date format');
      }
    });

    it('should reject expense without required fields', () => {
      const invalidExpense = {
        amount: 100,
      };

      const result = validateRequest(expenseSchema, invalidExpense);
      expect(result.success).toBe(false);
    });

    it('should accept expense with null event_id', () => {
      const validExpense = {
        category_id: 1,
        event_id: null,
        amount: 1000,
        vendor: 'Test Vendor',
        expense_date: '2024-01-15',
      };

      const result = validateRequest(expenseSchema, validExpense);
      expect(result.success).toBe(true);
    });
  });

  describe('expenseApprovalSchema', () => {
    it('should validate approval with status and notes', () => {
      const validApproval = {
        status: 'approved',
        notes: 'Looks good',
      };

      const result = validateRequest(expenseApprovalSchema, validApproval);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('approved');
        expect(result.data.notes).toBe('Looks good');
      }
    });

    it('should validate rejection with reason', () => {
      const validRejection = {
        status: 'rejected',
        rejection_reason: 'Missing receipts',
      };

      const result = validateRequest(expenseApprovalSchema, validRejection);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidApproval = {
        status: 'pending',
      };

      const result = validateRequest(expenseApprovalSchema, invalidApproval);
      expect(result.success).toBe(false);
    });

    it('should validate approval without optional fields', () => {
      const validApproval = {
        status: 'approved',
      };

      const result = validateRequest(expenseApprovalSchema, validApproval);
      expect(result.success).toBe(true);
    });

    it('should reject rejection without reason or notes', () => {
      const invalidRejection = {
        status: 'rejected',
      };

      const result = validateRequest(expenseApprovalSchema, invalidRejection);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('reason');
      }
    });

    it('should accept rejection with notes only', () => {
      const validRejection = {
        status: 'rejected',
        notes: 'Does not meet criteria',
      };

      const result = validateRequest(expenseApprovalSchema, validRejection);
      expect(result.success).toBe(true);
    });
  });
});

describe('Report Validations', () => {
  describe('reportFiltersSchema', () => {
    it('should validate monthly report request', () => {
      const validRequest = {
        type: 'monthly',
        fiscal_year: '2024-25',
        format: 'pdf',
      };

      const result = validateRequest(reportFiltersSchema, validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('monthly');
        expect(result.data.format).toBe('pdf');
      }
    });

    it('should validate category report with date range', () => {
      const validRequest = {
        type: 'category',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        format: 'csv',
      };

      const result = validateRequest(reportFiltersSchema, validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate all report types', () => {
      const reportTypes = ['monthly', 'category', 'budget', 'audit', 'vendor', 'expenses', 'summary'];

      reportTypes.forEach((type) => {
        const request = { type, format: 'pdf' };
        const result = validateRequest(reportFiltersSchema, request);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid report type', () => {
      const invalidRequest = {
        type: 'invalid-type',
        format: 'pdf',
      };

      const result = validateRequest(reportFiltersSchema, invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid format', () => {
      const invalidRequest = {
        type: 'monthly',
        format: 'xlsx',
      };

      const result = validateRequest(reportFiltersSchema, invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should default format to pdf when not specified', () => {
      const request = {
        type: 'monthly',
      };

      const result = validateRequest(reportFiltersSchema, request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe('pdf');
      }
    });

    it('should accept optional fiscal_year', () => {
      const request = {
        type: 'category',
        format: 'csv',
      };

      const result = validateRequest(reportFiltersSchema, request);
      expect(result.success).toBe(true);
    });
  });
});
