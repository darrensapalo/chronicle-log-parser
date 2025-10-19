-- CreateTable
CREATE TABLE "log_transformations" (
    "id" SERIAL NOT NULL,
    "api_version" INTEGER NOT NULL,
    "author" TEXT,
    "raw_log" TEXT NOT NULL,
    "filter_code" TEXT NOT NULL,
    "generated_output" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_transformations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transformation_reports" (
    "id" SERIAL NOT NULL,
    "transformation_id" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transformation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transformation_reports_transformation_id_idx" ON "transformation_reports"("transformation_id");

-- AddForeignKey
ALTER TABLE "transformation_reports" ADD CONSTRAINT "transformation_reports_transformation_id_fkey" FOREIGN KEY ("transformation_id") REFERENCES "log_transformations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
