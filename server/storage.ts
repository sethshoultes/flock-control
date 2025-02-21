import { counts, type Count, type InsertCount } from "@shared/schema";

export interface IStorage {
  getCounts(): Promise<Count[]>;
  addCount(count: InsertCount): Promise<Count>;
}

export class MemStorage implements IStorage {
  private counts: Map<number, Count>;
  private currentId: number;

  constructor() {
    this.counts = new Map();
    this.currentId = 1;
  }

  async getCounts(): Promise<Count[]> {
    return Array.from(this.counts.values()).sort((a, b) => {
      const timeA = a.timestamp?.getTime() ?? 0;
      const timeB = b.timestamp?.getTime() ?? 0;
      return timeB - timeA;
    });
  }

  async addCount(insertCount: InsertCount): Promise<Count> {
    const id = this.currentId++;
    const count: Count = {
      ...insertCount,
      id,
      timestamp: new Date(),
      imageUrl: insertCount.imageUrl ?? null
    };
    this.counts.set(id, count);
    return count;
  }
}

export const storage = new MemStorage();