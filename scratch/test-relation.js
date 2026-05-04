const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const holdings = await prisma.holding.findMany({
      include: { fund: true }
    })
    console.log('Holdings with funds count:', holdings.length)
    if (holdings.length > 0) {
      console.log('First holding fund:', holdings[0].fund.schemeName)
    }
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
