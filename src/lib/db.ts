import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure the SQLite file can be found reliably with an absolute path
// On Windows, Prisma requires forward slashes in the file: URL
const dbPath = path.join(process.cwd(), 'db/custom.db').replace(/\\/g, '/')
const dbUrl = `file:${dbPath}`

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db