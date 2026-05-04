import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Robust database path resolution for both Local and Vercel
const getDatabasePath = () => {
  // If a full URL is provided (like in Vercel for Postgres), use it directly
  if (process.env.DATABASE_URL?.startsWith('postgres')) {
    return process.env.DATABASE_URL
  }

  const rootPath = process.cwd()
  const possiblePaths = [
    path.join(rootPath, 'db/custom.db'),
    path.join(rootPath, 'prisma/db/custom.db'),
    // Fallback for Vercel deployment where files are in a different structure
    path.join('/var/task', 'db/custom.db'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return `file:${p.replace(/\\/g, '/')}`
    }
  }

  // Local development fallback
  return process.env.DATABASE_URL || 'file:./db/custom.db'
}

const dbUrl = getDatabasePath()

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