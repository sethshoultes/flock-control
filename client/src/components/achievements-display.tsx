import { useQuery } from "@tanstack/react-query";
import { Achievement } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Target, Crown, Star, Bird } from "lucide-react";
import { format } from "date-fns";

type AchievementWithEarnedDate = Achievement & {
  earnedAt?: string;
};

type AchievementsResponse = {
  achievements: AchievementWithEarnedDate[];
  availableAchievements: Achievement[];
};

const ICONS = {
  Award,
  Target,
  Crown,
  Star,
  Bird
} as const;

function AchievementCard({ 
  achievement, 
  earned = false 
}: { 
  achievement: AchievementWithEarnedDate; 
  earned?: boolean;
}) {
  const IconComponent = ICONS[achievement.icon as keyof typeof ICONS] || Award;

  return (
    <Card className={`bg-card border-2 ${earned ? 'border-primary/50' : 'border-muted/20 opacity-70'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`rounded-full p-2 ${earned ? 'bg-primary/10' : 'bg-muted/20'}`}>
            <IconComponent className={`h-6 w-6 ${earned ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="space-y-1">
            <h4 className={`text-sm font-medium ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>
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
}

export function AchievementsDisplay() {
  const { data, isLoading } = useQuery<AchievementsResponse>({
    queryKey: ["/api/achievements"],
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading achievements...</div>;
  }

  if (!data || !data.achievements) {
    return <div className="text-sm text-muted-foreground">No achievements available</div>;
  }

  return (
    <div className="space-y-8">
      {/* Earned Achievements */}
      {data.achievements.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.achievements.map(achievement => (
            <AchievementCard 
              key={achievement.id} 
              achievement={achievement} 
              earned={true}
            />
          ))}
        </div>
      )}

      {/* Available Achievements */}
      {data.availableAchievements?.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-foreground">Available Achievements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.availableAchievements.map(achievement => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                earned={false}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}