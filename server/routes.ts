import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import { insertCountSchema } from "@shared/schema";
import { setupAuth, requireAuth } from "./auth";
import * as crypto from 'crypto';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  app.post("/api/analyze", async (req, res) => {
    try {
      const { image } = req.body;
      const isAuthenticated = req.isAuthenticated();
      const userId = isAuthenticated ? (req.user as any).id : 0;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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

      // Add additional breed information to labels if present
      if (result.additionalBreeds?.length) {
        result.labels.push(...result.additionalBreeds.map(breed => `additional-breed:${breed}`));
      }

      // Add age group to labels
      if (result.ageGroup) {
        result.labels.push(`age:${result.ageGroup}`);
      }

      // Add health status to labels
      if (result.healthStatus) {
        result.labels.push(`health:${result.healthStatus}`);
      }

      let count;

      // Only store in database if user is authenticated
      if (isAuthenticated) {
        count = await storage.addCount(userId, {
          count: result.count,
          imageUrl: image,
          breed: result.breed,
          confidence: result.confidence,
          labels: result.labels,
          userId: userId
        });
      } else {
        // For guest users, create a count object without storing in database
        count = {
          id: crypto.randomUUID(), // Client-side ID for guest mode
          userId: 0,
          count: result.count,
          imageUrl: image,
          timestamp: new Date(),
          breed: result.breed,
          confidence: result.confidence,
          labels: [...result.labels, "guest-mode"]
        };
      }

      res.json({ count });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/counts", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const counts = await storage.getCounts(userId);
      res.json({ counts });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}