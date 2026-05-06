import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isProduction = process.env.NODE_ENV === 'production'

// Determine DB URL - on Vercel standalone, we need absolute path
const getDatabaseUrl = () => {
  if (isProduction) {
    // Relative to standalone server.js, prisma folder is in the root
    return `file:${path.join(process.cwd(), 'prisma', 'db.sqlite')}`
  }
  return process.env.DATABASE_URL
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
  })

if (!isProduction) globalForPrisma.prisma = db