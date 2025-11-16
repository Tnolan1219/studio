
'use client';

import { Header } from '@/components/header';
import { FirebaseClientProvider } from '@/firebase';

function TermsView() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 animate-fade-in">
        <div className="max-w-4xl mx-auto prose dark:prose-invert">
          <h1>Terms of Use</h1>
          <p className="text-sm text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Valentor RE ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>2. Service Description</h2>
          <p>
            The Service provides real estate analysis tools for informational purposes only. It is not financial, legal, or investment advice. You are solely responsible for your investment decisions.
          </p>

          <h2>3. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without any warranties of any kind, including that the service will be uninterrupted or error-free. There is no warranty as to the accuracy, completeness, or reliability of any information or calculations provided.
          </p>

          <h2>4. Limitation of Liability</h2>
          <p>
            In no event shall Valentor RE or its developers be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses, resulting from the use of the service.
          </p>

          <h2>5. User Conduct</h2>
          <p>
            You agree not to use the Service for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the Service in any way that could damage the Service, services, or general business of Valentor RE.
          </p>
          
           <h2>6. Account and Data</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and password. We reserve the right to terminate accounts, edit or remove content in our sole discretion. All user-generated content and data are stored in Firebase, and its security is subject to Firebase's terms and security practices.
          </p>

          <h2>7. Modification of Terms</h2>
          <p>
            We reserve the right to change or modify these Terms at any time. Your continued use of the Service will be deemed acceptance of the amended terms.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function TermsPage() {
    return (
        <FirebaseClientProvider>
            <TermsView />
        </FirebaseClientProvider>
    )
}
