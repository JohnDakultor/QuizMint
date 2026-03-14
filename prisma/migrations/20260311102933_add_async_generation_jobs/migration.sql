-- Safe no-op on fresh databases: this migration ran before table creation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'AsyncGenerationJob'
  ) THEN
    ALTER TABLE "AsyncGenerationJob" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
