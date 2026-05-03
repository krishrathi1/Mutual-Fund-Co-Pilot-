import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure Vercel serverless functions can find the SQLite file
const dbPath = path.join(process.cwd(), 'db/custom.db')
const dbUrl = process.env.NODE_ENV === 'production' 
  ? `file:${dbPath}`
  : process.env.DATABASE_URL || 'file:./db/custom.db'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db