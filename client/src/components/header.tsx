import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthMutations } from "@/hooks/use-auth";
import { LogIn, LogOut, User, Trophy, ChevronDown, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { ThemeSelector } from "@/components/theme-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user } = useAuth();
  const { logoutMutation } = useAuthMutations();
  const [, setLocation] = useLocation();

  return (
    <header className="border-b">
      <div className="container max-w-2xl mx-auto p-4 flex items-center justify-between">
        <h1 
          onClick={() => setLocation("/")} 
          className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent cursor-pointer"
        >
          Flock Counter
        </h1>

        {user ? (
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user.username}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocation("/achievements")} className="cursor-pointer">
                  <Trophy className="h-4 w-4 mr-2" />
                  Achievements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dev-tools")} className="cursor-pointer">
                  <Wrench className="h-4 w-4 mr-2" />
                  Dev Tools
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/auth")}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}