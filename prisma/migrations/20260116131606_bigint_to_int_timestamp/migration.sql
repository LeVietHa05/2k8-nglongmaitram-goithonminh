/*
  Warnings:

  - You are about to alter the column `timestamp` on the `SleepData1` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `timestamp` on the `SleepData2` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SleepData1" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "micRMS" REAL NOT NULL,
    "piezoPeak" REAL NOT NULL,
    "state" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SleepData1" ("createdAt", "id", "micRMS", "piezoPeak", "state", "timestamp") SELECT "createdAt", "id", "micRMS", "piezoPeak", "state", "timestamp" FROM "SleepData1";
DROP TABLE "SleepData1";
ALTER TABLE "new_SleepData1" RENAME TO "SleepData1";
CREATE TABLE "new_SleepData2" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "heartRate" REAL NOT NULL,
    "spo2" REAL NOT NULL,
    "temperature" REAL NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SleepData2" ("createdAt", "heartRate", "id", "spo2", "temperature", "timestamp") SELECT "createdAt", "heartRate", "id", "spo2", "temperature", "timestamp" FROM "SleepData2";
DROP TABLE "SleepData2";
ALTER TABLE "new_SleepData2" RENAME TO "SleepData2";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
