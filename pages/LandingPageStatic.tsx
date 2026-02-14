import React from 'react';
import { Mic, FileText, Linkedin, Mail, CalendarClock, ArrowRight, CheckCircle, Upload, Sparkles, Send } from 'lucide-react';

const APP_LOGIN_URL = 'https://app.loquihq.com/login';
const APP_SIGNUP_URL = 'https://app.loquihq.com/signup';

const LandingPageStatic: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Navigation */}
      <nav className="bg-gray-50 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Mic className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">LoquiHQ</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href={APP_LOGIN_URL} className="text-gray-600 hover:text-gray-900 font-medium">Sign In</a>
              <a href={APP_SIGNUP_URL} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition font-medium">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
              Stop Letting Your Podcast <span className="text-primary">Die After Publish Day</span>
            </h1>
            <p className="text-xl text-gray-700 mb-4">
              LoquiHQ turns every episode into LinkedIn posts, newsletters, and scheduled content &mdash; automatically.
            </p>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              One upload. Multiple assets. Real distribution.
            </p>
            <a href={APP_SIGNUP_URL} className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl text-lg font-bold shadow-lg hover:bg-primary/90 hover:-translate-y-1 transition transform">
              Turn My Episode Into Content
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Section 1 — The Brutal Truth */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
            Recording Isn't the Hard Part. <span className="text-primary">Distribution Is.</span>
          </h2>
          <div className="space-y-5 text-lg text-gray-700 leading-relaxed">
            <p>You don't need more episodes. You need more <strong className="text-gray-900">reach</strong>.</p>
            <p>Right now:</p>
            <ul className="space-y-3 pl-1">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1.5 shrink-0">&#9679;</span>
                <span>Your transcript sits untouched.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1.5 shrink-0">&#9679;</span>
                <span>Your ideas fade after 48 hours.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1.5 shrink-0">&#9679;</span>
                <span>Your content never compounds.</span>
              </li>
            </ul>
            <p className="pt-2">
              You're creating assets. But you're not <strong className="text-gray-900">extracting value</strong>.
            </p>
            <p className="text-primary font-semibold text-xl">That's the leak.</p>
          </div>
        </div>
      </section>

      {/* Section 2 — The Shift */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8">
            One Episode. <span className="text-primary">Multiple Pieces of Content.</span>
          </h2>
          <p className="text-lg text-gray-700 mb-10">
            LoquiHQ analyzes your transcript and instantly generates:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
            {[
              'LinkedIn-ready posts',
              'AI-formatted newsletters',
              'Structured email series',
              'Platform-specific captions',
              'Episode summaries that convert',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-3 border border-gray-300">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <span className="text-gray-800 font-medium">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600 mt-8 text-lg">
            Not generic AI output. <strong className="text-gray-900">Content shaped for distribution.</strong>
          </p>
        </div>
      </section>

      {/* Section 3 — What Makes This Different */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              This Isn't a Social Scheduler
            </h2>
            <p className="text-xl text-primary font-semibold">
              It's an AI Podcast Content Repurposing Engine.
            </p>
          </div>
          <p className="text-lg text-gray-700 text-center mb-10">
            Most tools start with a blank box. We start with <strong className="text-gray-900">your episode</strong>. That changes everything.
          </p>
          <div className="space-y-4">
            {[
              'Analyzes your transcript',
              'Extracts core ideas',
              'Builds platform-specific content',
              'Lets you schedule or publish',
              'Sends newsletters from your connected email',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-gray-800">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-lg">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center text-lg text-gray-600 space-y-1">
            <p>No bouncing between five tools.</p>
            <p>No manual rewriting.</p>
            <p className="font-semibold text-gray-900">No wasted episodes.</p>
          </div>
        </div>
      </section>

      {/* Section 4 — SEO Feature Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Podcast Content Automation <span className="text-primary">Built for Creators Who Move</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-6 bg-gray-100 rounded-2xl border border-gray-300 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Transcript Analysis</h3>
              <p className="text-gray-600">Upload your episode. Get structured insight instantly.</p>
            </div>
            <div className="p-6 bg-gray-100 rounded-2xl border border-gray-300 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Linkedin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Podcast to LinkedIn Content</h3>
              <p className="text-gray-600">Generate posts designed for authority and engagement.</p>
            </div>
            <div className="p-6 bg-gray-100 rounded-2xl border border-gray-300 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Podcast Newsletter Generator</h3>
              <p className="text-gray-600">Turn conversations into formatted, ready-to-send emails.</p>
            </div>
            <div className="p-6 bg-gray-100 rounded-2xl border border-gray-300 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <CalendarClock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule Podcast Social Posts</h3>
              <p className="text-gray-600">Plan distribution from inside one dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — Positioning */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8">
            Your Podcast Is a Content Goldmine. <span className="text-primary">Start Mining It.</span>
          </h2>
          <div className="text-lg text-gray-700 space-y-4 leading-relaxed">
            <p>You're already doing the hard work. Recording. Editing. Publishing.</p>
            <p>
              LoquiHQ makes sure the episode keeps working <strong className="text-gray-900">long after it goes live</strong>.
            </p>
            <p className="text-primary font-semibold text-xl pt-2">
              Because attention compounds. And episodes shouldn't expire.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6 — How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Simple. Focused. Effective.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            {[
              { icon: Upload, label: 'Upload transcript' },
              { icon: Sparkles, label: 'Run AI analysis' },
              { icon: FileText, label: 'Generate content' },
              { icon: Send, label: 'Schedule or publish' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-4 bg-gray-100 rounded-xl px-5 py-4 border border-gray-300">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <span className="text-gray-800 font-medium text-lg">{label}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 text-lg text-gray-600 space-y-1">
            <p>That's the system.</p>
            <p>No chaos. No scattered workflow. <strong className="text-gray-900">No content waste.</strong></p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
            If You're Going to Record, <span className="text-primary">You Might As Well Distribute.</span>
          </h2>
          <p className="text-lg text-gray-700 mb-4">Stop publishing and praying.</p>
          <p className="text-lg text-gray-700 mb-10">Start building momentum.</p>
          <a href={APP_SIGNUP_URL} className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl text-lg font-bold shadow-lg hover:bg-primary/90 hover:-translate-y-1 transition transform">
            Turn My Episode Into Content
            <ArrowRight className="h-5 w-5" />
          </a>
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
