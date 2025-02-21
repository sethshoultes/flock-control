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
              { type: "text", text: "Count the number of chickens in this image. Respond with ONLY the number, no additional text." },
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
      const count = Number(result.count);

      if (isNaN(count)) {
        throw new Error("Invalid count received from OpenAI");
      }

      const countRecord = await storage.addCount({
        count,
        imageUrl: image
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