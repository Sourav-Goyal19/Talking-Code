CREATE TABLE IF NOT EXISTS "extension_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extension_source_code_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_embeddings" vector(768),
	"source_code" text NOT NULL,
	"file_name" text NOT NULL,
	"summary" text NOT NULL,
	"extension_projectId" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_source_code_embeddings" ADD CONSTRAINT "extension_source_code_embeddings_extension_projectId_extension_projects_id_fk" FOREIGN KEY ("extension_projectId") REFERENCES "public"."extension_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
