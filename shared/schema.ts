import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
  icon: text("icon").notNull(), // Lucide icon name
  requirement: integer("requirement").notNull(), // Number required to earn
  type: text("type").notNull(), // 'total_count', 'unique_breeds', 'accuracy', etc.
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const loginSchema = insertUserSchema;

// Count schemas
export const insertCountSchema = createInsertSchema(counts).pick({
  count: true,
  imageUrl: true,
  userId: true,
  breed: true,
  confidence: true,
  labels: true,
});

// Achievement schemas
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements);

// Custom type for Count that allows string IDs for guest mode
export type Count = {
  id: number | string;
  userId: number;
  count: number;
  imageUrl: string | null;
  timestamp: Date | null;
  breed: string | null;
  confidence: number | null;
  labels: string[] | null;
};

export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCount = z.infer<typeof insertCountSchema>;
export type User = typeof users.$inferSelect;