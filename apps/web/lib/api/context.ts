import type { inferAsyncReturnType } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { prisma } from "@mise-pos/database";

export async function createContext(opts?: FetchCreateContextFnOptions) {
  const session = await getServerSession(authOptions);

  return {
    session,
    prisma,
    headers: opts?.req.headers,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
