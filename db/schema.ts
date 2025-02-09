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
  userId: uuid("user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const projectsRelations = relations(projectsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
}));

export const insertProjectsSchema = createInsertSchema(projectsTable);
