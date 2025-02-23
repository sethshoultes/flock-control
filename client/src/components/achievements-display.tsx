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
    <Card className="bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Achievements
        </CardTitle>
        <CardDescription>
          Your counting milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((achievement: Achievement & { earnedAt: string }) => {
            const Icon = iconMap[achievement.icon] || Award;
            return (
              <Card key={achievement.id} className="bg-muted/50 dark:bg-muted/10">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-2 dark:bg-primary/20">
                      <Icon className="h-6 w-6 text-primary dark:text-primary/90" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-foreground">{achievement.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Earned {format(new Date(achievement.earnedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}