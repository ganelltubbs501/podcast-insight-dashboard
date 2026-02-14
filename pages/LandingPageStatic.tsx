import React, { useState } from 'react';
import { Mic, FileText, Linkedin, Mail, CalendarClock, ArrowRight, CheckCircle, XCircle, Upload, Sparkles, Send, ChevronDown, ChevronUp, Zap, BarChart3, Users } from 'lucide-react';

const APP_LOGIN_URL = 'https://app.loquihq.com/login';
const APP_SIGNUP_URL = 'https://app.loquihq.com/signup';

const FAQItem: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left bg-gray-100 hover:bg-gray-200 transition"
      >
        <span className="text-lg font-semibold text-gray-900 pr-4">{question}</span>
        {open ? <ChevronUp className="h-5 w-5 text-gray-500 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-6 py-5 bg-gray-50 text-gray-700 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

const LandingPageStatic: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Navigation */}
      <nav className="bg-gray-50 border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Mic className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">LoquiHQ</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href={APP_LOGIN_URL} className="text-gray-600 hover:text-gray-900 font-medium">Sign In</a>
              <a href={APP_SIGNUP_URL} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition font-medium">
                Start Free
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
              Turn Your Podcast Into Content That Actually <span className="text-primary">Drives Growth</span>
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              Stop dumping transcripts into generic AI tools and hoping for magic. LoquiHQ analyzes your episode and generates:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left mb-10">
              {[
                'High-converting LinkedIn posts',
                'Structured newsletter content',
                'Email series drafts',
                'Platform-ready copy',
                'Scheduled publishing',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-gray-800 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-8">
              Built specifically for podcasters who want <strong className="text-gray-900">reach, leads, and authority</strong> &mdash; not random AI output.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href={APP_SIGNUP_URL} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl text-lg font-bold shadow-lg hover:bg-primary/90 hover:-translate-y-1 transition transform">
                Get Your Podcast Readout
                <ArrowRight className="h-5 w-5" />
              </a>
              <a href={APP_SIGNUP_URL} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 text-gray-900 border border-gray-300 rounded-xl text-lg font-bold hover:bg-gray-200 transition">
                Start Free
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What LoquiHQ Actually Does */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              What LoquiHQ <span className="text-primary">Actually Does</span>
            </h2>
            <p className="text-lg text-gray-600">
              Most AI tools just rewrite text. LoquiHQ analyzes your episode and turns it into a <strong className="text-gray-900">complete content engine</strong>.
            </p>
          </div>
          <p className="text-lg text-gray-700 mb-6 font-medium">After you upload your transcript, you get:</p>
          <div className="space-y-3 mb-10">
            {[
              'LinkedIn-ready thought leadership posts',
              'Email newsletter formatted and structured',
              'Email series draft',
              'Platform-specific copy (not generic rewrites)',
              'Built-in scheduling',
              'Content calendar view',
              'Direct publishing to LinkedIn',
              'Email delivery via Gmail / SendGrid / Kit / Mailchimp',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-gray-800 text-lg">{item}</span>
              </div>
            ))}
          </div>
          <div className="text-center text-lg text-gray-600 space-y-1">
            <p>No copy-paste gymnastics.</p>
            <p>No prompt engineering.</p>
            <p className="font-semibold text-gray-900">No juggling five tools.</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              LoquiHQ vs <span className="text-primary">Generic AI Tools</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 text-gray-900 font-bold text-lg">Feature</th>
                  <th className="text-center py-4 px-4 text-primary font-bold text-lg">LoquiHQ</th>
                  <th className="text-center py-4 px-4 text-gray-500 font-bold text-lg">Generic AI</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Built for podcasts', loqui: true, generic: false },
                  { feature: 'Transcript analysis', loqui: 'Structured analysis', generic: 'Raw text only' },
                  { feature: 'Platform-specific formatting', loqui: true, generic: 'You must prompt it' },
                  { feature: 'Newsletter formatting', loqui: 'Done for you', generic: 'Manual' },
                  { feature: 'Email series builder', loqui: 'Included', generic: 'Manual' },
                  { feature: 'Direct LinkedIn publishing', loqui: true, generic: false },
                  { feature: 'Content calendar', loqui: true, generic: false },
                  { feature: 'Scheduling engine', loqui: true, generic: false },
                  { feature: 'Multi-platform workflow', loqui: 'Unified', generic: 'Disconnected tools' },
                ].map(({ feature, loqui, generic }) => (
                  <tr key={feature} className="border-b border-gray-300">
                    <td className="py-3.5 px-4 text-gray-800 font-medium">{feature}</td>
                    <td className="py-3.5 px-4 text-center">
                      {loqui === true ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-green-700 font-medium text-sm">{loqui}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {generic === false ? (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-gray-500 text-sm">{generic}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 text-center">
            <p className="text-lg text-gray-600">Generic AI gives you text.</p>
            <p className="text-xl text-gray-900 font-bold mt-1">LoquiHQ gives you a <span className="text-primary">workflow</span>.</p>
          </div>
        </div>
      </section>

      {/* Built for Podcasters Who Want Leverage */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
            Built for Podcasters Who Want <span className="text-primary">Leverage</span>
          </h2>
          <p className="text-lg text-gray-700 mb-6">If you're:</p>
          <div className="space-y-3 mb-8">
            {[
              'Posting once and disappearing',
              'Sitting on dozens of episodes with no repurposing',
              'Spending hours rewriting transcripts',
              'Copying content into five different platforms',
              'Manually scheduling posts',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="text-primary mt-1.5 shrink-0">&bull;</span>
                <span className="text-gray-800 text-lg">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-lg text-gray-700 mb-2">You don't need another AI chat window.</p>
          <p className="text-lg text-gray-700 mb-6">You need <strong className="text-gray-900">infrastructure</strong>.</p>
          <p className="text-xl text-primary font-semibold text-center">
            LoquiHQ turns every episode into a multi-channel content strategy.
          </p>
        </div>
      </section>

      {/* From Episode to Growth Engine */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              From Episode <span className="text-primary">&rarr;</span> Growth Engine
            </h2>
            <p className="text-lg text-gray-600">Here's the flow:</p>
          </div>
          <div className="space-y-4 max-w-md mx-auto">
            {[
              { icon: Upload, label: 'Upload your transcript' },
              { icon: Sparkles, label: 'Run AI analysis' },
              { icon: FileText, label: 'Review LinkedIn + Newsletter drafts' },
              { icon: Send, label: 'Schedule or publish instantly' },
              { icon: CalendarClock, label: 'Watch it appear in your content calendar' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-4 bg-gray-100 rounded-xl px-5 py-4 border border-gray-300">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <span className="text-gray-800 font-medium text-lg">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-lg text-gray-600 mt-8">
            It's built to <strong className="text-gray-900">remove friction</strong>.
          </p>
        </div>
      </section>

      {/* Email Built In */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Email <span className="text-primary">Built In</span>
            </h2>
          </div>
          <p className="text-lg text-gray-700 mb-8 text-center">
            LoquiHQ integrates directly with:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto mb-10">
            {['Gmail', 'SendGrid', 'Kit (ConvertKit)', 'Mailchimp'].map((provider) => (
              <div key={provider} className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-center">
                <span className="text-gray-900 font-semibold text-sm">{provider}</span>
              </div>
            ))}
          </div>
          <div className="text-center text-lg text-gray-700 space-y-2">
            <p>You choose your list. You choose your template. You schedule your send.</p>
            <p className="font-semibold text-gray-900 mt-4">Your email goes out from <span className="text-primary">your account</span>. Not ours.</p>
          </div>
        </div>
      </section>

      {/* SEO Feature Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Podcast Content Automation <span className="text-primary">Built for Creators Who Move</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Sparkles, title: 'AI Transcript Analysis', desc: 'Upload your episode. Get structured insight instantly.' },
              { icon: Linkedin, title: 'Podcast to LinkedIn Content', desc: 'Generate posts designed for authority and engagement.' },
              { icon: Mail, title: 'AI Newsletter Generator', desc: 'Turn conversations into formatted, ready-to-send emails.' },
              { icon: CalendarClock, title: 'Scheduling Engine', desc: 'Plan and schedule distribution from one dashboard.' },
              { icon: BarChart3, title: 'Content Calendar', desc: 'See your entire content pipeline at a glance.' },
              { icon: Users, title: 'Team Collaboration', desc: 'Invite team members and manage content together.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 bg-gray-100 rounded-2xl border border-gray-300 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof-Focused Positioning */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8">
            This Isn't "AI for Everything."
          </h2>
          <p className="text-lg text-gray-700 mb-6">This is:</p>
          <div className="space-y-3 max-w-md mx-auto text-left mb-10">
            {[
              'AI podcast repurposing',
              'AI LinkedIn post generator for podcasters',
              'AI newsletter creator from podcast episodes',
              'Podcast content automation',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary shrink-0" />
                <span className="text-gray-800 font-medium text-lg">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-lg text-gray-700 mb-2">
            It removes the 80% friction that keeps creators inconsistent.
          </p>
          <p className="text-lg text-gray-700 mb-1">Consistency builds <strong className="text-gray-900">authority</strong>.</p>
          <p className="text-xl text-primary font-bold">Authority builds growth.</p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            <FAQItem
              question="What is the best way to turn a podcast into LinkedIn content?"
              answer={
                <p>The most effective way is to analyze the episode structure, extract insights, and rewrite them into platform-native posts. LoquiHQ does this automatically by converting transcripts into LinkedIn-ready content with the right formatting, hooks, and structure for engagement.</p>
              }
            />
            <FAQItem
              question="Can I turn my podcast into a newsletter automatically?"
              answer={
                <p>Yes. LoquiHQ generates structured newsletter drafts directly from your episode transcript. You can then schedule and send them using your connected email provider &mdash; Gmail, SendGrid, Kit, or Mailchimp.</p>
              }
            />
            <FAQItem
              question="Does LoquiHQ publish directly to LinkedIn?"
              answer={
                <p>Yes. After connecting your LinkedIn account, you can schedule and publish posts directly from the platform. No copy-pasting required.</p>
              }
            />
            <FAQItem
              question="Is this better than using ChatGPT for podcast content?"
              answer={
                <>
                  <p className="mb-2">If you only want text output, generic AI works.</p>
                  <p>If you want transcript analysis, platform formatting, scheduling, and publishing &mdash; LoquiHQ is built specifically for that workflow. It's the difference between a blank text box and a purpose-built content engine.</p>
                </>
              }
            />
            <FAQItem
              question="Do I need multiple tools?"
              answer={
                <>
                  <p className="mb-3">No. LoquiHQ combines:</p>
                  <ul className="space-y-1.5 ml-1">
                    {['Transcript analysis', 'Content generation', 'Scheduling', 'Content calendar', 'LinkedIn publishing', 'Email sending'].map(item => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">Into one system.</p>
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
            You Already Recorded the Episode.<br />
            <span className="text-primary">Don't Let It Die After Upload.</span>
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Turn every episode into authority, visibility, distribution, and growth.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href={APP_SIGNUP_URL} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl text-lg font-bold shadow-lg hover:bg-primary/90 hover:-translate-y-1 transition transform">
              Get Your Podcast Readout
              <ArrowRight className="h-5 w-5" />
            </a>
            <a href={APP_SIGNUP_URL} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-200 text-gray-900 border border-gray-300 rounded-xl text-lg font-bold hover:bg-gray-300 transition">
              Start Using LoquiHQ Today
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600">&copy; 2026 LoquiHQ. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="/privacy" className="text-gray-600 hover:text-gray-800 transition">Privacy Policy</a>
              <a href="/terms" className="text-gray-600 hover:text-gray-800 transition">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageStatic;
