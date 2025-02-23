import { db } from "./db";
import { achievements, userAchievements, counts, type Achievement } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { Award, Target, Crown, Star, Bird } from "lucide-react";

// Initial achievements remain unchanged
export const INITIAL_ACHIEVEMENTS = [
  {
    name: "Novice Counter",
    description: "Count your first flock of chickens",
    icon: "Target",
    requirement: 1,
    type: "total_counts"
  },
  {
    name: "Experienced Counter",
    description: "Count 10 flocks of chickens",
    icon: "Award",
    requirement: 10,
    type: "total_counts"
  },
  {
    name: "Master Counter",
    description: "Count 50 flocks of chickens",
    icon: "Crown",
    requirement: 50,
    type: "total_counts"
  },
  {
    name: "Elite Counter",
    description: "Count 100 flocks of chickens",
    icon: "Crown",
    requirement: 100,
    type: "total_counts"
  },
  {
    name: "Breed Expert",
    description: "Identify 5 different chicken breeds",
    icon: "Star",
    requirement: 5,
    type: "unique_breeds"
  },
  {
    name: "Breed Master",
    description: "Identify 10 different chicken breeds",
    icon: "Star",
    requirement: 10,
    type: "unique_breeds"
  },
  {
    name: "Flock Master",
    description: "Count a flock of more than 100 chickens",
    icon: "Bird",
    requirement: 100,
    type: "single_count"
  },
  {
    name: "Mega Flock",
    description: "Count a flock of more than 500 chickens",
    icon: "Bird",
    requirement: 500,
    type: "single_count"
  },
  {
    name: "Daily Counter",
    description: "Count chickens on 5 different days",
    icon: "Target",
    requirement: 5,
    type: "unique_days"
  },
  {
    name: "Weekly Counter",
    description: "Count chickens on 7 consecutive days",
    icon: "Award",
    requirement: 7,
    type: "consecutive_days"
  }
];

export class AchievementService {
  async initializeAchievements() {
    console.log('Initializing achievements...');
    try {
      // Check if achievements already exist
      const existingAchievements = await db.select().from(achievements);

      if (existingAchievements.length === 0) {
        console.log('Creating initial achievements...');
        await db.insert(achievements).values(INITIAL_ACHIEVEMENTS);
      }
    } catch (error) {
      console.error('Error initializing achievements:', error);
    }
  }

  async checkAchievements(userId: number) {
    console.log(`Checking achievements for user ${userId}`);
    try {
      const [
        totalCounts,
        uniqueBreeds,
        maxSingleCount,
        uniqueDays,
        consecutiveDays
      ] = await Promise.all([
        // Get total count entries
        db.select({ count: sql<number>`count(*)` })
          .from(counts)
          .where(eq(counts.userId, userId)),

        // Get unique breeds count
        db.select({ count: sql<number>`count(distinct ${counts.breed})` })
          .from(counts)
          .where(and(
            eq(counts.userId, userId),
            sql`${counts.breed} is not null`
          )),

        // Get maximum single count
        db.select({ max: sql<number>`max(${counts.count})` })
          .from(counts)
          .where(eq(counts.userId, userId)),

        // Get count of unique days
        db.select({ count: sql<number>`count(distinct date(${counts.timestamp}))` })
          .from(counts)
          .where(eq(counts.userId, userId)),

        // Get max consecutive days
        db.select({
          max: sql<number>`
            max(consecutive_days)
            from (
              select
                count(*) as consecutive_days
              from (
                select
                  date(timestamp),
                  date(timestamp) - make_interval(days => row_number() over (order by date(timestamp))) as grp
                from (
                  select distinct date(timestamp)
                  from counts
                  where user_id = ${userId}
                ) dates
              ) grouped
              group by grp
            ) consecutive
          `
        })
      ]);

      const stats = {
        totalCounts: Number(totalCounts[0]?.count || 0),
        uniqueBreeds: Number(uniqueBreeds[0]?.count || 0),
        maxSingleCount: Number(maxSingleCount[0]?.max || 0),
        uniqueDays: Number(uniqueDays[0]?.count || 0),
        consecutiveDays: Number(consecutiveDays[0]?.max || 0)
      };

      console.log(`User stats:`, stats);

      // Get all achievements and user's current achievements
      const [allAchievements, userAchieved] = await Promise.all([
        db.select().from(achievements),
        db.select().from(userAchievements).where(eq(userAchievements.userId, userId))
      ]);

      const achievedIds = new Set(userAchieved.map(ua => ua.achievementId));
      const newAchievements: Achievement[] = [];

      // Check each achievement
      for (const achievement of allAchievements) {
        if (achievedIds.has(achievement.id)) continue;

        let earned = false;
        switch (achievement.type) {
          case 'total_counts':
            earned = stats.totalCounts >= achievement.requirement;
            break;
          case 'unique_breeds':
            earned = stats.uniqueBreeds >= achievement.requirement;
            break;
          case 'single_count':
            earned = stats.maxSingleCount >= achievement.requirement;
            break;
          case 'unique_days':
            earned = stats.uniqueDays >= achievement.requirement;
            break;
          case 'consecutive_days':
            earned = stats.consecutiveDays >= achievement.requirement;
            break;
        }

        if (earned) {
          console.log(`User ${userId} earned achievement: ${achievement.name}`);
          await db.insert(userAchievements).values({
            userId,
            achievementId: achievement.id
          });
          newAchievements.push(achievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  async getUserAchievements(userId: number) {
    console.log(`Getting achievements for user ${userId}`);
    try {
      // Get all achievements
      const allAchievements = await db.select().from(achievements);

      // Get user's earned achievements with timestamps
      const earnedAchievements = await db
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));

      // Convert earned achievements into a Set for quick lookup
      const earnedSet = new Set(earnedAchievements.map(ua => ua.achievementId));

      // Map earned achievements with their earned timestamps
      const earned = allAchievements
        .filter(achievement => earnedSet.has(achievement.id))
        .map(achievement => ({
          ...achievement,
          earnedAt: earnedAchievements.find(ua => ua.achievementId === achievement.id)?.earnedAt
        }));

      // Get available achievements (not yet earned)
      const available = allAchievements.filter(achievement => !earnedSet.has(achievement.id));

      return {
        achievements: earned,
        availableAchievements: available
      };
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return {
        achievements: [],
        availableAchievements: []
      };
    }
  }
}

export const achievementService = new AchievementService();