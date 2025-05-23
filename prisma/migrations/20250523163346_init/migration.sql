-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rtmpUrl" TEXT NOT NULL,
    "rtspUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "logPath" TEXT NOT NULL,
    "restartAttempts" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3),
    "lastHealthCheck" TIMESTAMP(3),
    "resolution" TEXT,
    "fps" INTEGER,
    "videoBitrate" TEXT,
    "audioBitrate" TEXT,
    "disableAudio" BOOLEAN,
    "isHealthy" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stream_name_key" ON "Stream"("name");
