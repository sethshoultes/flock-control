import { useQuery } from "@tanstack/react-query";
import { Achievement } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Target, Crown, Star, Bird } from "lucide-react";
import { format } from "date-fns";

const iconMap = {
  Award,
  Target,
  Crown,
  Star,
  Bird
};

interface AchievementWithEarnedDate extends Achievement {
  earnedAt?: string;
}

interface AchievementsResponse {
  achievements: AchievementWithEarnedDate[];
  availableAchievements: Achievement[];
}

export function AchievementsDisplay() {
  const { data } = useQuery<AchievementsResponse>({
    queryKey: ["/api/achievements"],
    queryFn: async () => {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const data = await res.json();
      console.log('Achievement data:', data); // Debug log
      return data;
    }
  });

  if (!data?.achievements || !Array.isArray(data.achievements)) {
    console.log('No achievements data available');
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Earned Achievements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.achievements.map((achievement) => {
          const Icon = iconMap[achievement.icon as keyof typeof iconMap] || Award;
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
                    {achievement.earnedAt && (
                      <p className="text-xs text-muted-foreground/80">
                        Earned {format(new Date(achievement.earnedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Available Achievements */}
      {data.availableAchievements && data.availableAchievements.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-foreground">Available Achievements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.availableAchievements.map((achievement) => {
              const Icon = iconMap[achievement.icon as keyof typeof iconMap] || Award;
              return (
                <Card key={achievement.id} className="bg-card border-2 border-border/20 hover:border-border/30 opacity-60 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-muted/20 p-2">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}