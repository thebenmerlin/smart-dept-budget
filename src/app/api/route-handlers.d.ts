// augment NextAuth user to include role
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      name?: string;
    };
  }
}