import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='division'
      ) THEN
        ALTER TABLE users ADD COLUMN division TEXT DEFAULT '';
      END IF;
    END
    $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='division'
      ) THEN
        ALTER TABLE users DROP COLUMN division;
      END IF;
    END
    $$;
  `);
}
