import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      categories,
      subCategories,
      minAum,
      maxAum,
      minReturn1y,
      maxExpenseRatio,
      riskometer,
      sortBy,
      order,
      limit,
    } = body

    // Build where clause
    const where: Prisma.FundWhereInput = {}

    // Category filter
    if (categories && Array.isArray(categories) && categories.length > 0) {
      where.category = { in: categories }
    }

    // Sub-category filter
    if (subCategories && Array.isArray(subCategories) && subCategories.length > 0) {
      where.subCategory = { in: subCategories }
    }

    // AUM filters
    if (minAum != null || maxAum != null) {
      where.aumCrore = {}
      if (minAum != null) {
        (where.aumCrore as Prisma.FloatFilter)['gte'] = minAum
      }
      if (maxAum != null) {
        (where.aumCrore as Prisma.FloatFilter)['lte'] = maxAum
      }
    }

    // Min 1-year return filter (direct plan)
    if (minReturn1y != null) {
      where.directReturn1y = { gte: minReturn1y }
    }

    // Max expense ratio filter (direct plan)
    if (maxExpenseRatio != null) {
      where.directExpenseRatio = { lte: maxExpenseRatio }
    }

    // Riskometer filter
    if (riskometer && Array.isArray(riskometer) && riskometer.length > 0) {
      where.riskometer = { in: riskometer }
    }

    // Determine sort
    const orderDir: 'desc' | 'asc' = order === 'asc' ? 'asc' : 'desc'
    let orderBy: Prisma.FundOrderByWithRelationInput = { aumCrore: 'desc' }

    switch (sortBy) {
      case 'return1y':
        orderBy = { directReturn1y: orderDir }
        break
      case 'return3y':
        orderBy = { directReturn3y: orderDir }
        break
      case 'return5y':
        orderBy = { directReturn5y: orderDir }
        break
      case 'sharpe':
        orderBy = { directSharpe1y: orderDir }
        break
      case 'expenseRatio':
        orderBy = { directExpenseRatio: orderDir === 'desc' ? 'asc' : 'desc' } // Lower ER is better
        break
      case 'aum':
        orderBy = { aumCrore: orderDir }
        break
      default:
        orderBy = { aumCrore: 'desc' }
    }

    const maxLimit = Math.min(Math.max(limit || 20, 1), 100)

    const [funds, total] = await Promise.all([
      db.fund.findMany({
        where,
        orderBy,
        take: maxLimit,
      }),
      db.fund.count({ where }),
    ])

    // Build applied filters summary
    const appliedFilters: Record<string, unknown> = {}
    if (categories?.length) appliedFilters.categories = categories
    if (subCategories?.length) appliedFilters.subCategories = subCategories
    if (minAum != null) appliedFilters.minAum = minAum
    if (maxAum != null) appliedFilters.maxAum = maxAum
    if (minReturn1y != null) appliedFilters.minReturn1y = minReturn1y
    if (maxExpenseRatio != null) appliedFilters.maxExpenseRatio = maxExpenseRatio
    if (riskometer?.length) appliedFilters.riskometer = riskometer
    if (sortBy) appliedFilters.sortBy = sortBy
    if (order) appliedFilters.order = order

    return NextResponse.json({
      funds,
      total,
      appliedFilters,
    })
  } catch (error) {
    console.error('Error screening funds:', error)
    return NextResponse.json(
      { error: 'Failed to screen funds' },
      { status: 500 }
    )
  }
}
