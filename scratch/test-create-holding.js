const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const fund = await prisma.fund.findFirst()
    if (!fund) {
      console.log('No funds found to create a holding.')
      return
    }
    
    const holding = await prisma.holding.create({
      data: {
        sessionId: 'test-session',
        fundId: fund.id,
        planType: 'direct',
        units: 10,
        investedAmount: 1000,
        currentAmount: 1100,
      }
    })
    console.log('Created holding:', holding)
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
