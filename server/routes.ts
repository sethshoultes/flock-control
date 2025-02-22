import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import { insertCountSchema } from "@shared/schema";
import { ZodError } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    try {
      const { image } = req.body;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Analyze this image of chickens and provide:
                1. Total count of chickens
                2. Primary breed identification with confidence level (1-100)
                3. Notable characteristics or labels (e.g., 'healthy', 'free-range', 'young')

                Respond with a JSON object in this format:
                {
                  "count": number,
                  "breed": string,
                  "confidence": number,
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

      const countRecord = await storage.addCount({
        count: result.count,
        imageUrl: image,
        breed: result.breed,
        confidence: result.confidence,
        labels: result.labels
      });

      res.json({ count: countRecord });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/counts", async (_req, res) => {
    try {
      const counts = await storage.getCounts();
      res.json({ counts });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}