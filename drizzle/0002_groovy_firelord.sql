CREATE TABLE IF NOT EXISTS "commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"commit_message" text NOT NULL,
	"commit_hash" text NOT NULL,
	"commit_author_name" text NOT NULL,
	"commit_author_avatar" text NOT NULL,
	"commit_date" timestamp NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commits" ADD CONSTRAINT "commits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
