import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import AchievementsPage from "@/pages/achievements";
import DevTools from "@/pages/dev-tools";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/achievements" component={AchievementsPage} />
      <Route path="/dev-tools" component={DevTools} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;