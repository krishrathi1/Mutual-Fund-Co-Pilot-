const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const fundsCount = await prisma.fund.count()
    console.log('Funds count:', fundsCount)
    const holdingsCount = await prisma.holding.count()
    console.log('Holdings count:', holdingsCount)
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
