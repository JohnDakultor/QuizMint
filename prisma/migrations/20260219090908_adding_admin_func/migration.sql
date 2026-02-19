DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
  ELSE
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
