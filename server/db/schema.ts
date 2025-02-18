import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
  vector,
  index,
} from "drizzle-orm/pg-core";

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
  userId: uuid("user_id")
    .references(() => usersTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  treeStructure: text("tree_structure").notNull(),
});

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  commits: many(commitsTable),
  sourceCodeEmbedding: many(sourceCodeEmbeddingTable),
}));

export const insertProjectsSchema = createInsertSchema(projectsTable);

export const commitsTable = pgTable("commits", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projectsTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
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

export const sourceCodeEmbeddingTable = pgTable(
  "source_code_embedding",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceCode: text("source_code").notNull(),
    fileName: text("file_name").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    projectId: uuid("project_id")
      .references(() => projectsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    summaryEmbedding: vector("summary_embedding", { dimensions: 768 }),
  },
  // (table) => [
  //   index("embeddingIndex").using(
  //     "hnsw",
  //     table.embedding.op("vector_cosine_ops")
  //   ),
  // ]
  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.summaryEmbedding.op("vector_cosine_ops")
    ),
  })
);

export const sourceCodeEmbeddingRelations = relations(
  sourceCodeEmbeddingTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [sourceCodeEmbeddingTable.projectId],
      references: [projectsTable.id],
    }),
  })
);

export const extensionProjectsTable = pgTable("extension_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  githubUrl: text("github_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const extensionProjectsRelations = relations(
  extensionProjectsTable,
  ({ many }) => ({
    extensionSourceCodeEmbedding: many(extensionSourceCodeEmbeddingTable),
  })
);

export const extensionSourceCodeEmbeddingTable = pgTable(
  "extension_source_code_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    summaryEmbeddings: vector("summary_embeddings", { dimensions: 768 }),
    sourceCode: text("source_code").notNull(),
    fileName: text("file_name").notNull(),
    summary: text("summary").notNull(),
    extensionProjectId: uuid("extension_projectId")
      .references(() => extensionProjectsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export const extensionSourceCodeEmbeddingRelations = relations(
  extensionSourceCodeEmbeddingTable,
  ({ one }) => ({
    extensionProject: one(extensionProjectsTable, {
      fields: [extensionSourceCodeEmbeddingTable.extensionProjectId],
      references: [extensionProjectsTable.id],
    }),
  })
);
