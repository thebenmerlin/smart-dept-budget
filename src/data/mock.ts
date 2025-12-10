// Mock data for demo mode (no DB connection required)

export const mockUsers = [
  { id: 1, name: 'Dr. Rajesh Kumar', email: 'admin@rscoe.edu.in', role: 'admin', department: 'CSBS' },
  { id: 2, name: 'Prof. Sneha Patil', email: 'hod@rscoe.edu.in', role: 'hod', department: 'CSBS' },
  { id: 3, name: 'Mr. Amit Sharma', email:  'staff@rscoe.edu.in', role: 'staff', department: 'CSBS' },
];

export const mockCategories = [
  { id: 1, name: 'Infrastructure', description: 'Lab setup, repairs, furniture' },
  { id: 2, name: 'Hardware', description: 'Computer systems, peripherals' },
  { id: 3, name: 'Software', description: 'Licenses, subscriptions' },
  { id: 4, name: 'Workshops & FDPs', description: 'Faculty development programs' },
  { id: 5, name: 'Expert Sessions', description: 'Industry talks, honorarium' },
  { id: 6, name: 'Technical Events', description: 'Hackathons, competitions' },
  { id: 7, name: 'Student Activities', description: 'Club activities, competitions' },
  { id: 8, name: 'Miscellaneous', description:  'Stationery, printing, etc.' },
];

export const mockBudgets = [
  {
    id: 1,
    fiscalYear: '2024-25',
    proposedAmount: 1500000,
    allottedAmount: 1200000,
    variance: -300000,
    status: 'approved',
    createdAt: '2024-04-01',
  },
  {
    id: 2,
    fiscalYear: '2023-24',
    proposedAmount: 1200000,
    allottedAmount:  1100000,
    variance: -100000,
    status: 'closed',
    createdAt: '2023-04-01',
  },
];

export const mockExpenses = [
  {
    id:  1,
    category: 'Hardware',
    categoryId: 2,
    amount: 85000,
    vendor: 'Dell Technologies',
    date: '2024-06-15',
    description: '5x Dell OptiPlex Desktop Systems for AI Lab',
    status: 'approved',
    event: null,
    receiptUrl: '/receipts/dell-invoice. pdf',
  },
  {
    id: 2,
    category: 'Workshops & FDPs',
    categoryId:  4,
    amount: 45000,
    vendor: 'IIT Bombay',
    date: '2024-07-20',
    description: 'FDP on Machine Learning - Registration & Hospitality',
    status: 'approved',
    event: 'ML Workshop 2024',
    receiptUrl: '/receipts/fdp-receipt.pdf',
  },
  {
    id:  3,
    category: 'Software',
    categoryId: 3,
    amount: 120000,
    vendor: 'Microsoft',
    date: '2024-08-01',
    description:  'Azure Lab Services - Annual Subscription',
    status: 'approved',
    event:  null,
    receiptUrl: '/receipts/azure-invoice.pdf',
  },
  {
    id:  4,
    category: 'Expert Sessions',
    categoryId: 5,
    amount: 15000,
    vendor: 'Dr. Anil Kakodkar',
    date: '2024-09-10',
    description: 'Guest Lecture on Emerging Technologies',
    status: 'pending',
    event:  'Tech Talk Series',
    receiptUrl: null,
  },
  {
    id:  5,
    category: 'Technical Events',
    categoryId: 6,
    amount: 75000,
    vendor: 'Event Management Co.',
    date: '2024-10-05',
    description:  'Annual Hackathon - Prizes & Logistics',
    status:  'approved',
    event: 'CodeStorm 2024',
    receiptUrl:  '/receipts/hackathon. pdf',
  },
  {
    id:  6,
    category: 'Infrastructure',
    categoryId: 1,
    amount: 250000,
    vendor: 'Godrej Interio',
    date:  '2024-11-01',
    description:  'Lab furniture upgrade - 30 workstations',
    status: 'pending',
    event:  null,
    receiptUrl: null,
  },
];

export const mockReceipts = [
  { id: 1, expenseId: 1, filename: 'dell-invoice.pdf', url: '/receipts/dell-invoice.pdf', uploadedAt: '2024-06-16', size: '245 KB' },
  { id: 2, expenseId:  2, filename:  'fdp-receipt.pdf', url: '/receipts/fdp-receipt. pdf', uploadedAt: '2024-07-21', size: '128 KB' },
  { id: 3, expenseId: 3, filename: 'azure-invoice.pdf', url: '/receipts/azure-invoice.pdf', uploadedAt:  '2024-08-02', size: '312 KB' },
  { id: 4, expenseId: 5, filename: 'hackathon.pdf', url: '/receipts/hackathon.pdf', uploadedAt: '2024-10-06', size: '189 KB' },
];

export const mockEvents = [
  { id: 1, name: 'ML Workshop 2024', type: 'FDP', date: '2024-07-20', spending: 45000 },
  { id: 2, name: 'Tech Talk Series', type:  'Expert Session', date: '2024-09-10', spending: 15000 },
  { id: 3, name: 'CodeStorm 2024', type: 'Hackathon', date: '2024-10-05', spending: 75000 },
];

export const mockMonthlyData = [
  { month: 'Apr', total: 0 },
  { month: 'May', total: 25000 },
  { month: 'Jun', total: 85000 },
  { month: 'Jul', total: 45000 },
  { month: 'Aug', total: 120000 },
  { month: 'Sep', total:  15000 },
  { month: 'Oct', total: 75000 },
  { month: 'Nov', total: 250000 },
  { month: 'Dec', total:  0 },
];

export const mockCategoryData = [
  { category: 'Infrastructure', total:  250000 },
  { category:  'Hardware', total: 85000 },
  { category: 'Software', total: 120000 },
  { category: 'Workshops & FDPs', total: 45000 },
  { category: 'Expert Sessions', total:  15000 },
  { category:  'Technical Events', total: 75000 },
];

export function getAnalytics() {
  const totalSpent = mockExpenses. reduce((sum, e) => sum + e.amount, 0);
  const budget = mockBudgets[0];
  const utilization = (totalSpent / budget.allottedAmount) * 100;
  const remaining = budget.allottedAmount - totalSpent;

  return {
    totalSpent,
    allotted: budget.allottedAmount,
    proposed: budget.proposedAmount,
    utilization,
    remaining,
    fiscalYear: budget. fiscalYear,
    pendingCount: mockExpenses. filter((e) => e.status === 'pending').length,
    approvedCount: mockExpenses.filter((e) => e.status === 'approved').length,
    receiptsCount: mockReceipts.length,
  };
}