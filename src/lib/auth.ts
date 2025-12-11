import { cookies } from 'next/headers';
import { sql } from './db';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

export interface User {
  id: number;
  department_id: number;
  name: string;
  email: string;
  role: 'admin' | 'hod' | 'staff';
  is_active: boolean;
}

export interface Session {
  user:  User;
  expires:  Date;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password:  string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    departmentId: user. department_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token:  string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  try {
    const users = await sql`
      SELECT id, department_id, name, email, password_hash, role, is_active
      FROM users
      WHERE email = ${email. toLowerCase().trim()}
    `;

    if (users.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = users[0];

    if (!user.is_active) {
      return { success: false, error: 'Account is deactivated.  Contact administrator.' };
    }

    const isValid = await verifyPassword(password, user. password_hash);

    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;

    const userData:  User = {
      id: user.id,
      department_id: user.department_id,
      name: user.name,
      email:  user.email,
      role: user. role,
      is_active: user.is_active,
    };

    const token = await createToken(userData);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt. toISOString()})
    `;

    return { success:  true, user:  userData, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore. get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return null;
    }

    // FIX: Use proper column aliases to get user_id correctly
    const sessions = await sql`
      SELECT 
        s.id as session_id,
        s.user_id as user_id,
        u.department_id,
        u.name,
        u.email,
        u. role,
        u.is_active
      FROM sessions s
      JOIN users u ON u.id = s. user_id
      WHERE s.token = ${token} AND s.expires_at > NOW() AND u.is_active = true
    `;

    if (sessions.length === 0) {
      return null;
    }

    const session = sessions[0];

    // FIX: Use user_id from the query, not session.id
    return {
      id:  session.user_id,
      department_id: session.department_id,
      name: session.name,
      email:  session.email,
      role: session. role,
      is_active: session. is_active,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function logoutUser(token: string): Promise<void> {
  try {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles. includes(userRole);
}

export const ROLE_PERMISSIONS = {
  admin: ['create', 'read', 'update', 'delete', 'approve', 'manage_users', 'manage_budgets', 'view_reports', 'download_reports'],
  hod: ['create', 'read', 'update', 'approve', 'manage_budgets', 'view_reports', 'download_reports'],
  staff: ['create', 'read', 'view_reports'],
};

export function canPerformAction(role: string, action:  string): boolean {
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  return permissions?. includes(action) || false;
}