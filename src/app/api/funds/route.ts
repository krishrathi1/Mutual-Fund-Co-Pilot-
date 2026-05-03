import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const subCategory = searchParams.get('subCategory') || ''
    const sortBy = searchParams.get('sortBy') || 'aum'
    const order = searchParams.get('order') || 'desc'
    const planType = searchParams.get('planType') || 'direct'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Build where clause
    const where: Prisma.FundWhereInput = {}

    if (q) {
      where.OR = [
        { schemeName: { contains: q } },
        { fundHouse: { contains: q } },
        { subCategory: { contains: q } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (subCategory) {
      where.subCategory = subCategory
    }

    // Build orderBy
    const orderDir = order === 'asc' ? 'asc' : 'desc'
    let orderBy: Prisma.FundOrderByWithRelationInput = { aumCrore: orderDir }

    switch (sortBy) {
      case 'aum':
      case 'aumCrore':
        orderBy = { aumCrore: orderDir }
        break
      case 'expenseDiff':
        // We'll sort in memory after fetching since Prisma can't compute derived fields
        orderBy = { aumCrore: 'desc' }
        break
      case 'return1y':
      case 'directReturn1y':
        orderBy = planType === 'direct'
          ? { directReturn1y: orderDir }
          : { regularReturn1y: orderDir }
        break
      case 'return3y':
      case 'directReturn3y':
        orderBy = planType === 'direct'
          ? { directReturn3y: orderDir }
          : { regularReturn3y: orderDir }
        break
      case 'return5y':
      case 'directReturn5y':
        orderBy = planType === 'direct'
          ? { directReturn5y: orderDir }
          : { regularReturn5y: orderDir }
        break
      default:
        orderBy = { aumCrore: orderDir }
    }

    const [funds, total] = await Promise.all([
      db.fund.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      db.fund.count({ where }),
    ])

    // If sorting by expenseDiff, we need to sort in memory
    if (sortBy === 'expenseDiff') {
      funds.sort((a, b) => {
        const diffA = a.regularExpenseRatio - a.directExpenseRatio
        const diffB = b.regularExpenseRatio - b.directExpenseRatio
        return orderDir === 'desc' ? diffB - diffA : diffA - diffB
      })
    }

    return NextResponse.json({ funds, total })
  } catch (error) {
    console.error('Error fetching funds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funds' },
      { status: 500 }
    )
  }
}
