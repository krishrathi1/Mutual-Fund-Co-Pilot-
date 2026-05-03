import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Goals CRUD API

// Expected return by risk profile (annualized %)
const EXPECTED_RETURN_BY_RISK: Record<string, number> = {
  Conservative: 7,
  Moderate: 10,
  Aggressive: 13,
}

// Suggested allocation by risk profile
const ALLOCATION_BY_RISK: Record<string, { equity: number; debt: number; hybrid: number; gold: number }> = {
  Conservative: { equity: 20, debt: 60, hybrid: 10, gold: 10 },
  Moderate: { equity: 55, debt: 25, hybrid: 10, gold: 10 },
  Aggressive: { equity: 80, debt: 5, hybrid: 10, gold: 5 },
}

// GET /api/goals?sessionId=xxx - Get goals for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query parameter is required' },
        { status: 400 }
      )
    }

    const goals = await db.goal.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

// POST /api/goals - Create or update a goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, name, targetAmount, currentAmount, yearsToGoal, riskProfile, goalId } = body

    if (!sessionId || !name || targetAmount == null || yearsToGoal == null) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, name, targetAmount, yearsToGoal' },
        { status: 400 }
      )
    }

    if (targetAmount <= 0 || yearsToGoal <= 0) {
      return NextResponse.json(
        { error: 'targetAmount and yearsToGoal must be positive' },
        { status: 400 }
      )
    }

    const profile = riskProfile || 'Moderate'
    const currentAmt = currentAmount || 0
    const expectedReturn = EXPECTED_RETURN_BY_RISK[profile] ?? 10
    const suggestedAllocation = ALLOCATION_BY_RISK[profile] ?? ALLOCATION_BY_RISK.Moderate

    // Calculate monthly SIP needed using future value formula
    // FV = PV * (1+r)^n + PMT * [((1+r)^n - 1) / r] * (1+r)
    // Solving for PMT:
    // PMT = (FV - PV * (1+r)^n) / [((1+r)^n - 1) / r * (1+r)]
    const r = expectedReturn / 100 / 12 // Monthly rate
    const n = yearsToGoal * 12 // Number of months
    const fv = targetAmount
    const pv = currentAmt

    let monthlySipNeeded: number

    const futureValueOfCurrent = pv * Math.pow(1 + r, n)
    const remainingTarget = fv - futureValueOfCurrent

    if (remainingTarget <= 0) {
      // Current amount already exceeds or meets the target
      monthlySipNeeded = 0
    } else if (r === 0) {
      monthlySipNeeded = remainingTarget / n
    } else {
      const annuityFactor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
      monthlySipNeeded = remainingTarget / annuityFactor
    }

    // Round up to nearest 500
    monthlySipNeeded = Math.ceil(monthlySipNeeded / 500) * 500

    if (goalId) {
      // Update existing goal
      const existing = await db.goal.findUnique({ where: { id: goalId } })
      if (!existing) {
        return NextResponse.json(
          { error: 'Goal not found' },
          { status: 404 }
        )
      }

      if (existing.sessionId !== sessionId) {
        return NextResponse.json(
          { error: 'Goal does not belong to this session' },
          { status: 403 }
        )
      }

      const updated = await db.goal.update({
        where: { id: goalId },
        data: {
          name,
          targetAmount: parseFloat(String(targetAmount)),
          currentAmount: parseFloat(String(currentAmt)),
          yearsToGoal: parseInt(String(yearsToGoal)),
          riskProfile: profile,
          suggestedAllocation: JSON.stringify(suggestedAllocation),
          monthlySipNeeded,
        },
      })

      return NextResponse.json(updated)
    }

    // Create new goal
    const goal = await db.goal.create({
      data: {
        sessionId,
        name,
        targetAmount: parseFloat(String(targetAmount)),
        currentAmount: parseFloat(String(currentAmt)),
        yearsToGoal: parseInt(String(yearsToGoal)),
        riskProfile: profile,
        suggestedAllocation: JSON.stringify(suggestedAllocation),
        monthlySipNeeded,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating goal:', error)
    return NextResponse.json(
      { error: 'Failed to create/update goal' },
      { status: 500 }
    )
  }
}

// DELETE /api/goals?sessionId=xxx&goalId=yyy - Delete a goal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const goalId = searchParams.get('goalId')

    if (!sessionId || !goalId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: sessionId, goalId' },
        { status: 400 }
      )
    }

    const goal = await db.goal.findUnique({ where: { id: goalId } })

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    if (goal.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Goal does not belong to this session' },
        { status: 403 }
      )
    }

    await db.goal.delete({ where: { id: goalId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    )
  }
}
