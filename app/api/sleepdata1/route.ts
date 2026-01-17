import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ITEM {
  mic: string,
  pz: string,
  state: string,
  t: string,
}

export async function GET() {
  try {
    const data = await prisma.sleepData1.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(data)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an array' }, { status: 400 })
    }
    const data = await prisma.$transaction(
      body.map((item: ITEM) =>
        prisma.sleepData1.create({
          data: {
            micRMS: parseFloat(item.mic),
            piezoPeak: parseFloat(item.pz),
            state: parseInt(item.state),
            timestamp: Number(item.t),
          },
        })
      )
    )
    return NextResponse.json(data)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 })
  }
}
