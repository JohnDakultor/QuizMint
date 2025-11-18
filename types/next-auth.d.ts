import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    username?: string;
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      username?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}
