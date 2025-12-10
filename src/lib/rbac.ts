import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export type Role = 'admin' | 'hod' | 'staff';

export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}

export async function requireRole(req: NextRequest, allowed: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!allowed.includes(session.user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}