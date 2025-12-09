import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@mise-pos/database";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      organizationId: string;
      roleId: string;
      roleName: string;
      permissions: Record<string, boolean>;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    roleId: string;
    roleName: string;
    permissions: Record<string, boolean>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    roleId: string;
    roleName: string;
    permissions: Record<string, boolean>;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions: user.role.permissions as Record<string, boolean>,
        };
      },
    }),
    // PIN-based login for terminals
    CredentialsProvider({
      id: "pin",
      name: "PIN",
      credentials: {
        locationId: { label: "Location", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.locationId || !credentials?.pin) {
          throw new Error("Invalid PIN");
        }

        // Find user by PIN within the organization
        const location = await prisma.location.findUnique({
          where: { id: credentials.locationId },
        });

        if (!location) {
          throw new Error("Invalid location");
        }

        const user = await prisma.user.findFirst({
          where: {
            organizationId: location.organizationId,
            pin: credentials.pin,
            isActive: true,
          },
          include: { role: true },
        });

        if (!user) {
          throw new Error("Invalid PIN");
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions: user.role.permissions as Record<string, boolean>,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.organizationId = user.organizationId;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        firstName: token.firstName,
        lastName: token.lastName,
        organizationId: token.organizationId,
        roleId: token.roleId,
        roleName: token.roleName,
        permissions: token.permissions,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours
  },
};
