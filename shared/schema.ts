import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const counts = pgTable("counts", {
  id: serial("id").primaryKey(),
  count: integer("count").notNull(),
  imageUrl: text("image_url"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCountSchema = createInsertSchema(counts).pick({
  count: true,
  imageUrl: true,
});

export type InsertCount = z.infer<typeof insertCountSchema>;
export type Count = typeof counts.$inferSelect;
