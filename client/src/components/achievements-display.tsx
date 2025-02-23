import { useQuery } from "@tanstack/react-query";
import { Achievement } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Target, Crown, Star, Bird } from "lucide-react";
import { format } from "date-fns";

const iconMap: Record<string, React.ComponentType<any>> = {
  Award,
  Target,
  Crown,
  Star,
  Bird
};

interface AchievementResponse {
  achievements: (Achievement & { earnedAt?: string })[];
  availableAchievements: Achievement[];
}

export function AchievementsDisplay() {
  const { data: achievementsData } = useQuery<AchievementResponse>({
    queryKey: ["/api/achievements"],
    queryFn: async () => {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      return res.json();
    }
  });

  const earnedAchievements = achievementsData?.achievements || [];
  const availableAchievements = achievementsData?.availableAchievements || [];

  const renderAchievement = (achievement: Achievement & { earnedAt?: string }, earned: boolean) => {
    const Icon = iconMap[achievement.icon] || Award;
    return (
      <Card 
        key={achievement.id} 
        className={`bg-card border-2 ${
          earned 
            ? "border-border/50 hover:border-border/80" 
            : "border-border/20 hover:border-border/30 opacity-60"
        } transition-colors`}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-full p-2 ${
              earned 
                ? "bg-primary/10" 
                : "bg-muted/20"
            }`}>
              <Icon className={`h-6 w-6 ${
                earned 
                  ? "text-primary" 
                  : "text-muted-foreground"
              }`} />
            </div>
            <div className="space-y-1">
              <h4 className={`text-sm font-medium ${
                earned 
                  ? "text-card-foreground" 
                  : "text-muted-foreground"
              }`}>
                {achievement.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {achievement.description}
              </p>
              {earned && achievement.earnedAt && (
                <p className="text-xs text-muted-foreground/80">
                  Earned {format(new Date(achievement.earnedAt), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {earnedAchievements.map(achievement => renderAchievement(achievement, true))}
      </div>

      {availableAchievements.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-foreground">Available Achievements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableAchievements.map(achievement => renderAchievement(achievement, false))}
          </div>
        </>
      )}
    </div>
  );
}