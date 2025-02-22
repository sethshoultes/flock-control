import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import { insertCountSchema } from "@shared/schema";
import { setupAuth, requireAuth } from "./auth";
import * as crypto from 'crypto';
import { and, inArray } from "drizzle-orm";
import { achievementService } from "./achievements";
import { pool } from "./db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Add health check endpoint with detailed status
  app.get("/api/health", async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        res.json({ 
          status: 'healthy', 
          database: 'connected',
          auth: req.isAuthenticated() ? 'authenticated' : 'unauthenticated'
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({ 
        status: 'unhealthy', 
        database: 'disconnected',
        auth: req.isAuthenticated() ? 'authenticated' : 'unauthenticated',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.delete("/api/counts", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { countIds } = req.body;

      if (!Array.isArray(countIds)) {
        return res.status(400).json({ error: "countIds must be an array" });
      }

      await storage.deleteCounts(userId, countIds);
      console.log(`Successfully deleted counts ${countIds} for user ${userId}`);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting counts:', error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { image } = req.body;
      const isAuthenticated = req.isAuthenticated();
      const userId = isAuthenticated ? (req.user as any).id : 0;

      console.log(`Processing image analysis request for user ${userId} (authenticated: ${isAuthenticated})`);

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview-v2",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this image of chickens and provide detailed information:

                  1. Total count of chickens in the image
                  2. Primary breed identification with confidence level (1-100)
                  3. If multiple breeds are present, list all identified breeds
                  4. Age classification for the group (chicks/juveniles/adults)
                  5. Health assessment including:
                     - Overall condition (healthy/concerning/needs attention)
                     - Any visible health indicators
                  6. Environmental observations (free-range/caged/indoor/outdoor)
                  7. Additional characteristics or notable features

                  Respond with a JSON object in this format:
                  {
                    "count": number,
                    "breed": string,
                    "additionalBreeds": string[] | null,
                    "confidence": number,
                    "ageGroup": string,
                    "healthStatus": string,
                    "labels": string[]
                  }`
                },
                {
                  type: "image_url",
                  image_url: { url: image }
                }
              ]
            }
          ],
          max_tokens: 4096,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response from OpenAI");
        }

        const result = JSON.parse(content);

        // Validate all required fields are present
        if (typeof result.count !== 'number' ||
          typeof result.breed !== 'string' ||
          typeof result.confidence !== 'number' ||
          !Array.isArray(result.labels)) {
          throw new Error("Invalid response format from OpenAI");
        }

        // Process the count for database storage
        let count;
        if (isAuthenticated) {
          try {
            count = await storage.addCount(userId, {
              count: result.count,
              imageUrl: image,
              breed: result.breed,
              confidence: result.confidence,
              labels: result.labels,
              userId: userId
            });

            const newAchievements = await achievementService.checkAchievements(userId);
            res.json({ count, newAchievements });
          } catch (error) {
            console.error('Error saving count to database:', error);
            res.status(500).json({ 
              error: "Failed to save count",
              details: error instanceof Error ? error.message : "Database error"
            });
          }
        } else {
          // Guest mode response
          count = {
            id: crypto.randomUUID(),
            userId: 0,
            count: result.count,
            imageUrl: image,
            timestamp: new Date(),
            breed: result.breed,
            confidence: result.confidence,
            labels: [...result.labels, "guest-mode"]
          };
          res.json({ count });
        }
      } catch (error) {
        console.error('OpenAI API Error:', error);
        if (error instanceof Error && error.message.includes('deprecated')) {
          res.status(503).json({ 
            error: "Image analysis service is temporarily unavailable",
            details: "Our AI service is being upgraded. Please try again in a few minutes."
          });
        } else {
          res.status(500).json({ 
            error: "Failed to analyze image",
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    } catch (error) {
      console.error('Error in /api/analyze:', error);
      res.status(500).json({ 
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/counts", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log('Fetching counts for user:', userId);
      const counts = await storage.getCounts(userId);
      console.log(`Retrieved ${counts.length} counts for user ${userId}`);
      res.json({ counts });
    } catch (error) {
      console.error('Error fetching counts:', error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ 
        error: message,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Setup achievements route
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log('Fetching achievements for user:', userId);
      const achievements = await achievementService.getUserAchievements(userId);
      res.json({ achievements });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  achievementService.initializeAchievements(); // Initialize achievements

  const httpServer = createServer(app);
  return httpServer;
}