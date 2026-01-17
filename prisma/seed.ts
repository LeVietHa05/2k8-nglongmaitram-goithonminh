import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$transaction(async (tx) => {
    // Seed SleepData1
    await tx.sleepData1.create({
      data: { micRMS: 1.2, piezoPeak: 3.4, state: 1, timestamp: 1234567890 },
    })
    await tx.sleepData1.create({
      data: { micRMS: 2.3, piezoPeak: 4.5, state: 2, timestamp: 1234567891 },
    })

    // Seed SleepData2
    await tx.sleepData2.create({
      data: { heartRate: 70.0, spo2: 98.0, temperature: 36.5, timestamp: 1234567892 },
    })
    await tx.sleepData2.create({
      data: { heartRate: 75.0, spo2: 97.0, temperature: 36.8, timestamp: 1234567893 },
    })
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
