import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role enum
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.USER),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  openaiApiKey: text("openai_api_key"),
  theme: text("theme").default('light'),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  preferences: jsonb("preferences").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const counts = pgTable("counts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  count: integer("count").notNull(),
  imageUrl: text("image_url"),
  timestamp: timestamp("timestamp").defaultNow(),
  breed: text("breed"),
  confidence: integer("confidence"),
  labels: text("labels").array(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  requirement: integer("requirement").notNull(),
  type: text("type").notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

export const userSettingsSchema = createInsertSchema(userSettings);

export const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

export const insertCountSchema = createInsertSchema(counts).pick({
  count: true,
  imageUrl: true,
  userId: true,
  breed: true,
  confidence: true,
  labels: true,
});

export const insertAchievementSchema = createInsertSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements);

export type Count = typeof counts.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCount = z.infer<typeof insertCountSchema>;
export type User = typeof users.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;