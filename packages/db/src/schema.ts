import {
  AnyPgColumn,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const pageStatusEnum = pgEnum("page_status", [
  "new",
  "learning",
  "mastered",
]);

export const userTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  avatarUrl: text(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userRelations = relations(userTable, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
  refreshTokens: many(refreshTokens),
  canvases: many(canvases),
  magicLinkTokens: many(magicLinkTokens),
  folders: many(folders),
  pages: many(pages),
  templates: many(templates),
  reviewLogs: many(reviewLogs),
}));

export const oauthAccounts = pgTable("oauth_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => userTable.id, {
    onDelete: "cascade",
  }),
  provider: text().notNull(),
  providerAccountId: text().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(userTable, {
    fields: [oauthAccounts.userId],
    references: [userTable.id],
  }),
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => userTable.id, {
    onDelete: "cascade",
  }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(userTable, {
    fields: [refreshTokens.userId],
    references: [userTable.id],
  }),
}));

export const canvases = pgTable("canvases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => userTable.id, {
    onDelete: "cascade",
  }),
  title: text("title").default("Untitled").notNull(),
  elements: jsonb("elements"),
  thumbnail: text("thumbnail"),
  organizedSummary: text("organized_summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
});

export const canvasesRelations = relations(canvases, ({ one }) => ({
  user: one(userTable, {
    fields: [canvases.userId],
    references: [userTable.id],
  }),
}));

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, {
      onDelete: "cascade",
    }),
    templateId: uuid("template_id").references(
      (): AnyPgColumn => templates.id,
      {
        onDelete: "set null",
      },
    ),
    name: text("name").notNull(),
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userParentIdx: index("folders_user_parent_idx").on(
      table.userId,
      table.parentId,
    ),
  }),
);

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(userTable, {
    fields: [folders.userId],
    references: [userTable.id],
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: "folder_children",
  }),
  children: many(folders, { relationName: "folder_children" }),
  pages: many(pages),
  defaultTemplate: one(templates, {
    fields: [folders.templateId],
    references: [templates.id],
  }),
}));

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    elements: jsonb("elements").notNull(), // SketchElement[]
    thumbnail: text("thumbnail"),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("templates_user_id_idx").on(table.userId),
    isSystemIdx: index("templates_is_system_idx").on(table.isSystem),
  }),
);

export const templatesRelations = relations(templates, ({ one, many }) => ({
  user: one(userTable, {
    fields: [templates.userId],
    references: [userTable.id],
  }),
  folder: one(folders, {
    fields: [templates.folderId],
    references: [folders.id],
  }),
  foldersWithThisDefault: many(folders),
}));

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull().default("Untitled"),
    elements: jsonb("elements"),
    thumbnail: text("thumbnail"),
    status: pageStatusEnum("status").notNull().default("new"),
    pageOrder: integer("page_order").notNull().default(0),
    tags: text("tags").array(),
    searchableText: text("searchable_text"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    nextReviewAt: timestamp("next_review_at"),
    easeFactor: doublePrecision("ease_factor").notNull().default(2.5),
    interval: integer("interval").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userFolderIdx: index("pages_user_folder_idx").on(
      table.userId,
      table.folderId,
    ),
    userNextReviewIdx: index("pages_user_next_review_idx").on(
      table.userId,
      table.nextReviewAt,
    ),
    userStatusIdx: index("pages_user_status_idx").on(
      table.userId,
      table.status,
    ),
    searchIdx: index("pages_search_idx").on(table.searchableText),
  }),
);

export const pagesRelations = relations(pages, ({ one, many }) => ({
  user: one(userTable, {
    fields: [pages.userId],
    references: [userTable.id],
  }),
  folder: one(folders, {
    fields: [pages.folderId],
    references: [folders.id],
  }),
  reviewLogs: many(reviewLogs),
}));

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    pageId: uuid("page_id")
      .references(() => pages.id, { onDelete: "cascade" })
      .notNull(),
    quality: integer("quality").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("review_logs_user_id_idx").on(table.userId),
    createdAtIdx: index("review_logs_created_at_idx").on(table.createdAt),
  }),
);

export const reviewLogsRelations = relations(reviewLogs, ({ one }) => ({
  user: one(userTable, {
    fields: [reviewLogs.userId],
    references: [userTable.id],
  }),
  page: one(pages, {
    fields: [reviewLogs.pageId],
    references: [pages.id],
  }),
}));

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => userTable.id, {
    onDelete: "cascade",
  }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const magicLinkTokensRelations = relations(
  magicLinkTokens,
  ({ one }) => ({
    user: one(userTable, {
      fields: [magicLinkTokens.userId],
      references: [userTable.id],
    }),
  }),
);
