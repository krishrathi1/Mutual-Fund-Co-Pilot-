import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Robust database path resolution
const getDatabasePath = () => {
  const rootPath = process.cwd()
  const possiblePaths = [
    path.join(rootPath, 'db/custom.db'),
    path.join(rootPath, 'Desktop/Blostem/Mutual-Fund-Co-Pilot-/db/custom.db'),
    // If we're in src/lib/db.ts, root is 2 levels up
    path.join(__dirname, '../../db/custom.db'),
    // Absolute fallback for this environment
    'C:/Users/KRISH/Desktop/Blostem/Mutual-Fund-Co-Pilot-/db/custom.db'
  ]

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p.replace(/\\/g, '/')
      }
    } catch (e) {
      // ignore
    }
  }

  // Default to what we think is right
  return path.join(rootPath, 'db/custom.db').replace(/\\/g, '/')
}

const dbUrl = `file:${getDatabasePath()}`

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