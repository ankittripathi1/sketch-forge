ALTER TABLE "pages" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "view_mode" text DEFAULT 'canvas' NOT NULL;