
import { Header } from '@/components/header';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl font-headline">
            We're Not Just Building Software. We're Building Your Future.
          </h1>
          <p className="mt-6 text-xl text-muted-foreground">
            Valentor RE was born from a simple, powerful conviction: financial freedom through real estate isn't a privilege for the few—it's a right for the ambitious. We are a team of veterans, investors, and technologists who got tired of seeing good people sidelined by overly complex tools and opaque financial jargon.
          </p>
          <p className="mt-4 text-xl text-muted-foreground">
            We believe that a well-analyzed deal is the bedrock of wealth. Our platform is more than a calculator; it's your digital partner, your AI consultant, and your co-pilot on the journey to financial independence. We build tools that are ruthlessly efficient, intuitively designed, and powerfully intelligent, so you can stop guessing and start building your empire, one smart investment at a time.
          </p>
          <p className="mt-4 text-xl text-muted-foreground font-semibold">
            Your ambition deserves a tool that matches it. This is it.
          </p>
        </div>
      </main>
    </div>
  );
}
