import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { INITIAL_DB_BASE64 } from "./initial-db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function initPrisma(): PrismaClient {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const tmpDir = "/tmp";
    const tmpDbPath = path.join(tmpDir, "dev.db");

    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      if (!fs.existsSync(tmpDbPath)) {
        const localDbPath = path.join(process.cwd(), "prisma", "dev.db");
        if (fs.existsSync(localDbPath)) {
          fs.copyFileSync(localDbPath, tmpDbPath);
        } else if (INITIAL_DB_BASE64) {
          const buffer = Buffer.from(INITIAL_DB_BASE64, "base64");
          fs.writeFileSync(tmpDbPath, buffer);
        }
      }
    } catch (e) {
      console.error("Error setting up SQLite in /tmp:", e);
    }

    process.env.DATABASE_URL = `file:${tmpDbPath}`;

    return new PrismaClient({
      datasources: {
        db: {
          url: `file:${tmpDbPath}`,
        },
      },
      log: ["error"],
    });
  }

  return new PrismaClient({
    log: ["warn", "error"],
  });
}

export const prisma = globalForPrisma.prisma ?? initPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

