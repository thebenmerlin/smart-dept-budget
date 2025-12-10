import NextAuth, { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const [user] = await sql<
          { id: number; email: string; password_hash: string; role: string; name: string }
        >`select id, email, password_hash, role, name from users where email = ${credentials.email}`;
        if (!user) return null;
        const match = await bcrypt.compare(credentials.password, user.password_hash);
        if (!match) return null;
        return { id: user.id.toString(), email: user.email, role: user.role, name: user.name };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        (session.user as any).id = token.id;
      }
      return session;
    }
  }
};