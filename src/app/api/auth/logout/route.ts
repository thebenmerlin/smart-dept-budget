import { NextRequest, NextResponse } from 'next/server';
import { logoutUser, getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (token) {
      await logoutUser(token);
    }

    // Clear auth cookie
    cookieStore.delete('auth_token');

    if (user) {
      await createAuditLog({
        userId: user.id,
        action:  'LOGOUT',
        entityType:  'auth',
      });
    }

    return NextResponse. json({ success: true });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { success:  false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}