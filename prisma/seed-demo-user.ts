import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sessionId = 'demo-user-session'
  console.log(`🔄 Seeding demo user data for session: ${sessionId}`)

  // Clear existing demo data if any
  await prisma.holding.deleteMany({ where: { sessionId } })

  // Find some funds to add as regular plans
  const sbiLargeCap = await prisma.fund.findFirst({ where: { schemeName: { contains: 'SBI Bluechip' } } })
  const hdfcMidCap = await prisma.fund.findFirst({ where: { schemeName: { contains: 'HDFC Mid-Cap' } } })
  const axisSmallCap = await prisma.fund.findFirst({ where: { schemeName: { contains: 'Axis Small Cap' } } })
  const iciciTax = await prisma.fund.findFirst({ where: { schemeName: { contains: 'ICICI Prudential Bluechip' } } })

  const funds = [
    { fund: sbiLargeCap, amount: 500000, date: '2021-06-15' },
    { fund: hdfcMidCap, amount: 300000, date: '2022-01-10' },
    { fund: axisSmallCap, amount: 200000, date: '2023-03-20' },
    { fund: iciciTax, amount: 150000, date: '2020-11-05' }
  ]

  for (const item of funds) {
    if (item.fund) {
      const units = item.amount / item.fund.regularNav
      await prisma.holding.create({
        data: {
          sessionId,
          fundId: item.fund.id,
          planType: 'Regular',
          units,
          investedAmount: item.amount,
          currentAmount: units * item.fund.regularNav * (1.2 + Math.random() * 0.3), // Simulated gain
          purchaseDate: item.date,
          sipAmount: 0
        }
      })
      console.log(`✅ Added ${item.fund.schemeName} (Regular)`)
    }
  }

  console.log('\n🎉 Demo user seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
