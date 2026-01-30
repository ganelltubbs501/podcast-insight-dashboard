import React from 'react';
import { ArrowLeft } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <a href="/#/" className="text-gray-500 hover:text-gray-700">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 29, 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing or using LoquiHQ ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              LoquiHQ is a podcast analytics and management platform that provides:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Podcast transcript analysis and insights</li>
              <li>Content calendar and scheduling tools</li>
              <li>Guest outreach and management features</li>
              <li>Social media integration for content distribution</li>
              <li>Team collaboration features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
            <p className="text-gray-700 mb-4">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. User Content</h2>
            <p className="text-gray-700 mb-4">
              You retain ownership of all content you upload to the Service ("User Content"). By uploading User Content, you grant us a limited license to process, analyze, and store this content solely to provide the Service to you.
            </p>
            <p className="text-gray-700 mb-4">
              You represent that you have all necessary rights to upload and use your User Content, and that it does not violate any third-party rights or applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Third-Party Integrations</h2>
            <p className="text-gray-700 mb-4">
              The Service allows you to connect third-party accounts (Gmail, LinkedIn, X, Medium, etc.) to enable certain features. By connecting these accounts, you:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Authorize us to access and use these services on your behalf</li>
              <li>Agree to comply with the terms of service of those third-party platforms</li>
              <li>Acknowledge that we are not responsible for the actions of third-party services</li>
            </ul>
            <p className="text-gray-700 mb-4">
              You can disconnect third-party services at any time through your Settings page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload content that infringes on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Impersonate any person or entity</li>
              <li>Use automated means to access the Service without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              The Service and its original content (excluding User Content), features, and functionality are owned by LoquiHQ and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-gray-700 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-gray-700 mb-4">
              We do not warrant that the Service will be uninterrupted, secure, or error-free, or that any defects will be corrected.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOQUIHQ SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Termination</h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.
            </p>
            <p className="text-gray-700 mb-4">
              You may terminate your account at any time by contacting us. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms, please contact us at:
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

export default TermsOfService;
