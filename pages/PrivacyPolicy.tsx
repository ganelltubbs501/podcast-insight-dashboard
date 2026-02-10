import React from 'react';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <a href="/dashboard" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">LQ</div>
            <span className="font-bold text-gray-900 text-lg">LoquiHQ</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 29, 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              LoquiHQ ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our podcast analytics and management platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-gray-800 mb-2">2.1 Account Information</h3>
            <p className="text-gray-700 mb-4">
              When you create an account, we collect your name, email address, and password. If you sign up using a third-party service (like Google), we receive your name and email from that service.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">2.2 Podcast Content</h3>
            <p className="text-gray-700 mb-4">
              We collect and process podcast transcripts, audio files, and related metadata that you upload or connect to our platform for analysis purposes.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">2.3 Connected Services</h3>
            <p className="text-gray-700 mb-4">
              When you connect third-party services to LoquiHQ, we collect:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Gmail:</strong> Your email address and name. We request permission to send emails on your behalf for guest outreach. We do not read or store your emails.</li>
              <li><strong>LinkedIn:</strong> Your profile information for social media posting features.</li>
              <li><strong>X (Twitter):</strong> Your profile information for social media posting features.</li>
              <li><strong>Medium:</strong> Your profile information for content publishing features.</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">2.4 Usage Data</h3>
            <p className="text-gray-700 mb-4">
              We automatically collect information about how you interact with our platform, including pages visited, features used, and time spent on the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Analyze your podcast content and generate insights</li>
              <li>Send emails on your behalf when you use the guest outreach feature</li>
              <li>Publish content to connected social media platforms at your request</li>
              <li>Send you service-related notifications</li>
              <li>Respond to your comments and questions</li>
              <li>Protect against fraudulent or illegal activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Service Providers:</strong> We share data with third-party services that help us operate our platform (e.g., cloud hosting, analytics).</li>
              <li><strong>At Your Direction:</strong> When you connect third-party services or request actions that involve sharing data.</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Disconnect third-party services at any time through the Settings page</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Third-Party Services</h2>
            <p className="text-gray-700 mb-4">
              Our platform integrates with third-party services including Google (Gmail), LinkedIn, X (Twitter), and Medium. These services have their own privacy policies, and we encourage you to review them. We only access the minimum data necessary to provide our features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your personal information for as long as your account is active or as needed to provide you services. You can request deletion of your account and data at any time by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-700">
              Email: support@loquihq.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
