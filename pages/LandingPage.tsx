import React, { useState } from 'react';
import { Mic, FileText, Linkedin, Mail, CalendarClock, ArrowRight, CheckCircle, XCircle, Upload, Sparkles, Send, ChevronDown, ChevronUp, BarChart3, Users, Crown, DollarSign } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

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

const PricingInline: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [annual, setAnnual] = useState(true);

  const Cta: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
    <button onClick={onLogin} className={className}>{children}</button>
  );

  return (
    <section id="pricing" className="py-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Turn One Podcast Episode Into 20+ Assets &mdash; <span className="text-primary">Without Hiring a Team</span>
          </h2>
          <div className="text-lg text-gray-600 space-y-1 mb-8">
            <p>Stop paying freelancers. Stop duct-taping AI tools together.</p>
            <p>Stop copying and pasting between apps.</p>
            <p className="font-semibold text-gray-900 pt-2">LoquiHQ does the heavy lifting for you.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition ${annual ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : ''}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-500'}`}>Annual</span>
            {annual && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Save up to $398</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {/* Free Tier */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-300 flex flex-col">
            <h3 className="text-xl font-bold text-gray-900">Free</h3>
            <p className="text-4xl font-extrabold text-gray-900 mt-3">$0</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">No credit card required</p>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Upload & analyze transcripts (5/mo)',
                'Generate LinkedIn posts',
                'Generate newsletter content',
                'Email series drafting',
                'Content calendar access',
                'Gmail integration',
                '1 user',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Cta className="w-full py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition text-center block">
              Get Started Free
            </Cta>
          </div>

          {/* Beta Test — Free */}
          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-green-600 relative flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">BETA ACCESS</div>
            <h3 className="text-xl font-bold text-gray-900 mt-2">Beta Test</h3>
            <p className="text-4xl font-extrabold text-gray-900 mt-3">Free</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">No credit card required</p>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Upload & analyze transcripts',
                'Generate LinkedIn posts',
                'Generate newsletter content',
                'Email series drafting',
                'Content calendar',
                'Gmail integration',
                '1 user',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Cta className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition text-center block">
              Join the Beta
            </Cta>
          </div>

          {/* Starter */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-300 flex flex-col">
            <h3 className="text-xl font-bold text-gray-900">Starter</h3>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold text-gray-900 mt-3">$490<span className="text-base font-normal text-gray-500">/yr</span></p>
                <p className="text-sm text-green-600 font-semibold mt-1">Save $98 <span className="text-gray-500 font-normal">&mdash; $40.83/mo</span></p>
              </>
            ) : (
              <p className="text-4xl font-extrabold text-gray-900 mt-3">$49<span className="text-base font-normal text-gray-500">/mo</span></p>
            )}
            <p className="text-sm text-gray-500 mt-1 mb-5">Perfect for solo podcasters</p>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                'Upload & analyze transcripts',
                'Generate LinkedIn-ready posts',
                'Generate email newsletter content',
                'Email series drafting',
                'Schedule LinkedIn posts',
                'Schedule newsletters',
                'Content calendar',
                'Gmail integration',
                '1 user',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 italic mb-4">Replaces 5&ndash;10 hours of manual posting per month.</p>
            <p className="text-xs text-gray-500 mb-3 text-center">No contracts. Cancel anytime.</p>
            <Cta className="w-full py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition text-center block">
              Get Started
            </Cta>
          </div>

          {/* Pro */}
          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-primary relative flex flex-col transform md:-translate-y-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
            <h3 className="text-xl font-bold text-gray-900 mt-2">Pro</h3>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold text-gray-900 mt-3">$990<span className="text-base font-normal text-gray-500">/yr</span></p>
                <p className="text-sm text-green-600 font-semibold mt-1">Save $198 <span className="text-gray-500 font-normal">&mdash; $82.50/mo</span></p>
              </>
            ) : (
              <p className="text-4xl font-extrabold text-gray-900 mt-3">$99<span className="text-base font-normal text-gray-500">/mo</span></p>
            )}
            <p className="text-sm text-gray-500 mt-1 mb-5">For serious creators & growing brands</p>
            <p className="text-xs font-semibold text-primary mb-3">Everything in Starter, plus:</p>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                'SendGrid integration',
                'Kit (ConvertKit) integration',
                'Advanced email scheduling',
                'Multiple mailing list support',
                'Team access (up to 3 members)',
                'Priority support',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 italic mb-4">Replaces a VA + email automation tool stack.</p>
            <Cta className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition text-center block">
              Start Free Trial
            </Cta>
          </div>

          {/* Growth */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-300 flex flex-col">
            <div className="flex items-center gap-2 mb-0">
              <Crown className="h-5 w-5 text-amber-600" />
              <h3 className="text-xl font-bold text-gray-900">Growth</h3>
            </div>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold text-gray-900 mt-3">$1,990<span className="text-base font-normal text-gray-500">/yr</span></p>
                <p className="text-sm text-green-600 font-semibold mt-1">Save $398 <span className="text-gray-500 font-normal">&mdash; $165.83/mo</span></p>
              </>
            ) : (
              <p className="text-4xl font-extrabold text-gray-900 mt-3">$199<span className="text-base font-normal text-gray-500">/mo</span></p>
            )}
            <p className="text-sm text-gray-500 mt-1 mb-5">For agencies & podcast networks</p>
            <p className="text-xs font-semibold text-gray-700 mb-3">Everything in Pro, plus:</p>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                'Expanded team seats',
                'Multi-user workflow',
                'Role-based permissions',
                'Team scheduling visibility',
                'Higher publishing limits',
                'Dedicated onboarding call',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 italic mb-4">Replaces internal content coordination overhead.</p>
            <Cta className="w-full py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition text-center block">
              Contact Sales
            </Cta>
          </div>
        </div>
      </div>
    </section>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
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
              <button onClick={onLogin} className="text-gray-600 hover:text-gray-900 font-medium">Sign In</button>
              <button onClick={onLogin} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition font-medium">
                Start Free
              </button>
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
              <button onClick={onLogin} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl text-lg font-bold shadow-lg hover:bg-primary/90 hover:-translate-y-1 transition transform">
                Get Your Podcast Readout
                <ArrowRight className="h-5 w-5" />
              </button>
              <button onClick={onLogin} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 text-gray-900 border border-gray-300 rounded-xl text-lg font-bold hover:bg-gray-200 transition">
                Start Free
              </button>
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

      {/* Pricing Section */}
      <PricingInline onLogin={onLogin} />

      {/* Comparison Table */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Compare <span className="text-primary">Plans</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 pr-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Free</th>
                  <th className="text-center py-3 px-2 font-semibold text-green-600">Beta</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Starter</th>
                  <th className="text-center py-3 px-2 font-semibold text-primary">Pro</th>
                  <th className="text-center py-3 px-2 font-semibold text-amber-600">Growth</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {[
                  ['Transcript Analysis', '5/mo', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
                  ['Auto Publishing', '\u2014', '\u2014', '\u2705', '\u2705', '\u2705'],
                  ['CRM Integrations', 'Gmail', 'Gmail', 'Gmail', 'Gmail + SendGrid + Kit', 'All'],
                  ['Team Access', '\u2014', '\u2014', '\u2014', '3 seats', 'Expanded'],
                  ['Scheduling', 'Basic', 'Basic', 'Full', 'Advanced', 'Advanced'],
                ].map(([feature, ...values]) => (
                  <tr key={feature} className="border-b border-gray-200">
                    <td className="py-3 pr-4 font-medium text-gray-900">{feature}</td>
                    {values.map((v, i) => (
                      <td key={i} className="text-center py-3 px-2">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What This Replaces */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-10">
            What This <span className="text-primary">Replaces</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left mb-10">
            {[
              { cost: '$800\u2013$2,000/mo', label: 'Social media manager' },
              { cost: '$500+/mo', label: 'Newsletter copywriter' },
              { cost: 'Hours/week', label: 'Manual scheduling' },
              { cost: '3\u20135 tools', label: 'Disconnected workflow' },
            ].map(({ cost, label }) => (
              <div key={label} className="flex items-center gap-3 bg-gray-100 border border-gray-300 rounded-xl px-4 py-3">
                <DollarSign className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <span className="text-gray-900 font-bold text-sm">{cost}</span>
                  <span className="text-gray-600 text-sm ml-1">{label}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-lg text-gray-700 mb-1">LoquiHQ costs less than <strong className="text-gray-900">one freelancer</strong>.</p>
          <p className="text-xl text-primary font-bold">And it never sleeps.</p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            <FAQItem
              question="What is the best AI tool for podcasters?"
              answer={
                <p>LoquiHQ is built specifically for podcast transcript analysis and turning episodes into LinkedIn posts, newsletters, and email series &mdash; all in one place.</p>
              }
            />
            <FAQItem
              question="Can LoquiHQ post directly to LinkedIn?"
              answer={
                <p>Yes. You can connect LinkedIn and schedule posts directly from your dashboard.</p>
              }
            />
            <FAQItem
              question="Can I send newsletters from LoquiHQ?"
              answer={
                <p>Yes. You can generate and schedule newsletters using Gmail, SendGrid, or Kit integrations.</p>
              }
            />
            <FAQItem
              question="Does LoquiHQ replace ChatGPT?"
              answer={
                <p>LoquiHQ doesn't replace AI &mdash; it operationalizes it. Instead of prompting manually, you upload your transcript and get structured, platform-ready content instantly.</p>
              }
            />
            <FAQItem
              question="Is LoquiHQ good for podcast marketing?"
              answer={
                <p>Yes. It's designed specifically to turn podcast episodes into marketing assets across social and email channels.</p>
              }
            />
            <FAQItem
              question="Do I need a credit card for the beta?"
              answer={
                <p>No. Beta access is completely free and does not require any payment information. Just sign up and start using LoquiHQ immediately.</p>
              }
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
            You Already Recorded the Episode.<br />
            <span className="text-primary">Now Let It Work for You.</span>
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Turn every episode into authority, visibility, distribution, and growth.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={onLogin} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl text-lg font-bold shadow-lg hover:bg-primary/90 hover:-translate-y-1 transition transform">
              Start Turning Episodes Into Assets
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required for beta access.</p>
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

export default LandingPage;
