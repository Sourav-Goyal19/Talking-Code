import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, varchar, uuid } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  image: text("image"),
  password: varchar("password", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  projects: many(projectsTable),
}));

export const projectsTable = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  githubUrl: text("github_url").notNull(),
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  commits: many(commitsTable),
}));

export const insertProjectsSchema = createInsertSchema(projectsTable);

export const commitsTable = pgTable("commits", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projectsTable.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  commitMessage: text("commit_message").notNull(),
  commitHash: text("commit_hash").notNull(),
  commitAuthorName: text("commit_author_name").notNull(),
  commitAuthorAvatar: text("commit_author_avatar").notNull(),
  commitDate: text("commit_date").notNull(),
  summary: text("summary").notNull(),
});

export const commitsRelations = relations(commitsTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [commitsTable.projectId],
    references: [projectsTable.id],
  }),
}));

export const insertCommitsSchema = createInsertSchema(commitsTable);
