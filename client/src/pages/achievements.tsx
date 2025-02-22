import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { AchievementsDisplay } from "@/components/achievements-display";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function AchievementsPage() {
  const { user } = useAuth();

  // Redirect to auth if not logged in
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            My Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AchievementsDisplay />
        </CardContent>
      </Card>
    </div>
  );
}
