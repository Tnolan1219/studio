
import { Header } from '@/components/header';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 animate-fade-in">
        <div className="max-w-4xl mx-auto prose dark:prose-invert">
          <h1>Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy explains how Valentor RE ("we," "us," or "our") collects, uses, and discloses information about you when you access or use our services.
          </p>

          <h2>2. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, save a deal, or communicate with us. This may include:
            <ul>
              <li><strong>Account Information:</strong> Your name, email address, and password.</li>
              <li><strong>User Content:</strong> Deals you create, notes you write, and comments you post.</li>
              <li><strong>AI Interactions:</strong> Prompts you send to our AI features and the responses you receive. This data is processed by our AI providers (e.g., OpenAI, Google) under their respective privacy policies.</li>
            </ul>
          </p>
          
          <h2>3. How We Use Information</h2>
          <p>
            We use the information we collect to:
            <ul>
              <li>Provide, maintain, and improve our services.</li>
              <li>Personalize your experience.</li>
              <li>Communicate with you about products, services, and events.</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
            </ul>
          </p>

          <h2>4. Data Storage and Security</h2>
          <p>
            Your data is stored and secured using Google Firebase services (Authentication and Firestore). We rely on Firebase's security measures to protect your data. While we take reasonable measures to help protect information about you, no security system is impenetrable.
          </p>
          
          <h2>5. Data Sharing</h2>
          <p>
            We do not share your personal information with third parties except in the following cases:
            <ul>
                <li>With service providers who need access to such information to carry out work on our behalf (e.g., Google for AI processing).</li>
                <li>If we believe disclosure is necessary to comply with any applicable law, regulation, legal process, or governmental request.</li>
                <li>If you choose to publish a deal, certain information (your name, deal details) will be made public to the community.</li>
            </ul>
          </p>

          <h2>6. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. You can manage your profile information from the dashboard or request account deletion through our settings page.
          </p>
        </div>
      </main>
    </div>
  );
}
