import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ITEM {
  heartRate: string,
  spo2: string,
  temperature: string,
  timestamp: string,
}

export async function GET() {
  try {
    const data = await prisma.sleepData2.findMany({ orderBy: { createdAt: 'desc' } })
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
        prisma.sleepData2.create({
          data: {
            heartRate: parseFloat(item.heartRate),
            spo2: parseFloat(item.spo2),
            temperature: parseFloat(item.temperature),
            timestamp: Number(item.timestamp),
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
