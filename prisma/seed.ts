import { PrismaClient } from '@prisma/client'
import { fundSeedData } from './fundSeed'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with Indian Mutual Fund data...\n')

  // Clear existing funds (cascade deletes holdings too)
  const deleteResult = await prisma.fund.deleteMany()
  console.log(`🗑️  Cleared ${deleteResult.count} existing funds\n`)

  // Insert all funds
  let inserted = 0
  for (const fund of fundSeedData) {
    try {
      await prisma.fund.create({
        data: {
          schemeName: fund.schemeName,
          fundHouse: fund.fundHouse,
          category: fund.category,
          subCategory: fund.subCategory,
          riskometer: fund.riskometer,
          benchmark: fund.benchmark,
          fundManager: fund.fundManager,
          directIsin: fund.directIsin,
          directNav: fund.directNav,
          directExpenseRatio: fund.directExpenseRatio,
          directReturn1y: fund.directReturn1y,
          directReturn3y: fund.directReturn3y,
          directReturn5y: fund.directReturn5y,
          regularIsin: fund.regularIsin,
          regularNav: fund.regularNav,
          regularExpenseRatio: fund.regularExpenseRatio,
          regularReturn1y: fund.regularReturn1y,
          regularReturn3y: fund.regularReturn3y,
          regularReturn5y: fund.regularReturn5y,
          aumCrore: fund.aumCrore,
          exitLoad: fund.exitLoad,
          minInvestment: fund.minInvestment,
          launchDate: fund.launchDate,
          portfolioPeRatio: fund.portfolioPeRatio,
          portfolioPbRatio: fund.portfolioPbRatio,
          topHolding: fund.topHolding,
          topHoldingWeight: fund.topHoldingWeight,
          numStocks: fund.numStocks,
          debtPercentage: fund.debtPercentage,
          equityPercentage: fund.equityPercentage,
        },
      })
      inserted++
    } catch (error) {
      console.error(`❌ Failed to insert: ${fund.schemeName}`, error)
    }
  }

  console.log(`\n✅ Successfully seeded ${inserted} funds!\n`)

  // Summary by category
  const categories = await prisma.fund.groupBy({
    by: ['category', 'subCategory'],
    _count: { id: true },
    orderBy: [{ category: 'asc' }, { subCategory: 'asc' }],
  })

  console.log('📊 Fund count by category:')
  console.log('─'.repeat(50))
  for (const cat of categories) {
    console.log(`  ${cat.category} - ${cat.subCategory}: ${cat._count.id} funds`)
  }

  // Key data ranges
  const stats = await prisma.fund.aggregate({
    _min: { directExpenseRatio: true, aumCrore: true },
    _max: { directExpenseRatio: true, aumCrore: true },
    _avg: { directExpenseRatio: true, aumCrore: true },
  })

  console.log('\n📈 Key data ranges:')
  console.log('─'.repeat(50))
  console.log(`  Direct Expense Ratio: ${stats._min.directExpenseRatio}% - ${stats._max.directExpenseRatio}% (avg: ${stats._avg.directExpenseRatio?.toFixed(2)}%)`)
  console.log(`  AUM: ₹${stats._min.aumCrore} Cr - ₹${stats._max.aumCrore} Cr (avg: ₹${stats._avg.aumCrore?.toFixed(0)} Cr)`)

  // Expense ratio savings
  const funds = await prisma.fund.findMany({
    select: { schemeName: true, directExpenseRatio: true, regularExpenseRatio: true },
  })
  const avgSavings = funds.reduce((sum, f) => sum + (f.regularExpenseRatio - f.directExpenseRatio), 0) / funds.length
  console.log(`  Avg expense ratio savings (Direct vs Regular): ${avgSavings.toFixed(2)}%`)

  console.log('\n🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
