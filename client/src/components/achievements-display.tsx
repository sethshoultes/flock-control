import { useQuery } from "@tanstack/react-query";
import { Achievement } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Target, Crown, Star, Bird } from "lucide-react";
import { format } from "date-fns";

const iconMap: Record<string, React.ComponentType<any>> = {
  Award,
  Target,
  Crown,
  Star,
  Bird
};

export function AchievementsDisplay() {
  const { data: achievementsData } = useQuery({
    queryKey: ["/api/achievements"],
    queryFn: async () => {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      return res.json();
    }
  });

  const achievements = achievementsData?.achievements || [];

  if (!achievements.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {achievements.map((achievement: Achievement & { earnedAt: string }) => {
          const Icon = iconMap[achievement.icon] || Award;
          return (
            <Card key={achievement.id} className="bg-card border-2 border-border/50 hover:border-border/80 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-card-foreground">{achievement.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      Earned {format(new Date(achievement.earnedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}