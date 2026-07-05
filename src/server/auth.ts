import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/server/prisma";

type GithubProfile = {
  id?: number | string;
  login?: string;
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "read:user repo admin:repo_hook"
        }
      }
    })
  ],
  pages: {
    signIn: "/signin"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const githubProfile = profile as GithubProfile | undefined;
      if (!account?.access_token || !githubProfile?.id) return false;

      const username = githubProfile.login || user.name || user.email || "github-user";
      await prisma.user.upsert({
        where: {
          githubId: String(githubProfile.id)
        },
        update: {
          username,
          accessToken: account.access_token
        },
        create: {
          githubId: String(githubProfile.id),
          username,
          accessToken: account.access_token
        }
      });

      return true;
    },
    async jwt({ token, account, profile }) {
      const githubProfile = profile as GithubProfile | undefined;
      if (account?.access_token && githubProfile?.id) {
        token.githubId = String(githubProfile.id);
        token.username = githubProfile.login ? String(githubProfile.login) : token.username;
        token.accessToken = account.access_token;

        const user = await prisma.user.findUnique({
          where: {
            githubId: String(githubProfile.id)
          }
        });

        token.userId = user?.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId && token.githubId) {
        session.user.id = token.userId;
        session.user.githubId = token.githubId;
        session.user.username = token.username ?? session.user.name ?? "github-user";
      }

      return session;
    }
  }
};