ALTER TABLE "commits" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "extension_source_code_embeddings" ALTER COLUMN "extension_projectId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "source_code_embedding" ALTER COLUMN "project_id" SET NOT NULL;