import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, LogOut, User } from "lucide-react";
import { useLocation } from "wouter";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <header className="border-b">
      <div className="container max-w-2xl mx-auto p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Flock Counter
        </h1>

        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-4 w-4" />
              {user.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/auth")}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}