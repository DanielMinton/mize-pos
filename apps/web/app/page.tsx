import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold tracking-tight">
          Mise<span className="text-primary">POS</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Premium, AI-native point-of-sale for hospitality. Everything in its
          place.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 text-sm text-muted-foreground">
        <p>&ldquo;The ticket printer doesn&apos;t care about your excuses.&rdquo;</p>
      </div>
    </div>
  );
}
