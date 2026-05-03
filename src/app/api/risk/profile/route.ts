import { NextResponse } from 'next/server'

interface RiskProfile {
  riskProfile: string
  score: number
  maxScore: number
  allocation: { equity: number; debt: number; hybrid: number }
  description: string
  recommendedCategories: string[]
  tips: string[]
}

function getConservativeProfile(score: number): RiskProfile {
  return {
    riskProfile: 'Conservative',
    score,
    maxScore: 35,
    allocation: { equity: 20, debt: 60, hybrid: 20 },
    description: 'You prefer capital preservation over growth. Your portfolio should focus on stable, low-risk investments with minimal volatility.',
    recommendedCategories: ['Debt - Liquid', 'Debt - Short Duration', 'Debt - Corporate Bond', 'Hybrid - Conservative', 'Overnight Fund'],
    tips: [
      'Prioritize capital protection over returns',
      'Keep 6-12 months of expenses in liquid funds for emergencies',
      'Consider fixed deposits and sovereign gold bonds for stability',
      'Limit equity exposure to 20-30% through large cap or index funds',
      'Review portfolio quarterly but avoid frequent changes',
      'Focus on post-tax returns when comparing debt fund options',
    ],
  }
}

function getModerateProfile(score: number): RiskProfile {
  return {
    riskProfile: 'Moderate',
    score,
    maxScore: 35,
    allocation: { equity: 55, debt: 25, hybrid: 20 },
    description: 'You seek a balance between growth and stability. A diversified portfolio with moderate equity exposure suits your risk tolerance.',
    recommendedCategories: ['Large Cap', 'Flexi Cap', 'Hybrid - Aggressive', 'Debt - Corporate Bond', 'ELSS', 'Index - Nifty 50'],
    tips: [
      'Maintain a 60:40 or 50:50 equity-to-debt ratio',
      'Use SIPs to invest regularly and reduce timing risk',
      'Consider tax-saving ELSS funds for the equity portion',
      'Rebalance annually to maintain target allocation',
      'Increase equity allocation by 5% during market corrections',
      'Diversify across large, mid, and flexi cap funds',
    ],
  }
}

function getAggressiveProfile(score: number): RiskProfile {
  return {
    riskProfile: 'Aggressive',
    score,
    maxScore: 35,
    allocation: { equity: 75, debt: 10, hybrid: 15 },
    description: 'You are comfortable with high volatility in pursuit of superior returns. Your portfolio can handle significant short-term losses for long-term gains.',
    recommendedCategories: ['Mid Cap', 'Small Cap', 'Sectoral - Banking', 'Flexi Cap', 'ELSS', 'Thematic Fund'],
    tips: [
      'Take advantage of market downturns to increase equity exposure',
      'Allocate to mid and small cap funds for higher growth potential',
      'Keep only 10-15% in debt as emergency and stability buffer',
      'Consider sectoral/thematic funds for tactical allocation',
      'Review holdings semi-annually and stay invested for 7+ years',
      'Use step-up SIP to increase investments with income growth',
    ],
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'answers array is required' },
        { status: 400 }
      )
    }

    if (answers.length !== 7) {
      return NextResponse.json(
        { error: 'Exactly 7 answers are required (one per question)' },
        { status: 400 }
      )
    }

    // Validate each answer is 1-5
    for (let i = 0; i < answers.length; i++) {
      if (typeof answers[i] !== 'number' || answers[i] < 1 || answers[i] > 5) {
        return NextResponse.json(
          { error: `Answer ${i + 1} must be a number between 1 and 5` },
          { status: 400 }
        )
      }
    }

    const totalScore = answers.reduce((sum: number, a: number) => sum + a, 0)

    let profile: RiskProfile
    if (totalScore < 14) {
      profile = getConservativeProfile(totalScore)
    } else if (totalScore <= 21) {
      profile = getModerateProfile(totalScore)
    } else {
      profile = getAggressiveProfile(totalScore)
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error calculating risk profile:', error)
    return NextResponse.json(
      { error: 'Failed to calculate risk profile' },
      { status: 500 }
    )
  }
}
