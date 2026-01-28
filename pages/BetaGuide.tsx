import React from 'react';
import { CheckCircle, ArrowRight, Play, FileText, Share2, BarChart3, Users, DollarSign, Mail, Twitter, Youtube, Link, AlertTriangle } from 'lucide-react';

const BetaGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">LoquiHQ Beta Guide</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Welcome to the future of podcast intelligence. This guide will get you up and running in minutes.
        </p>
      </div>

      {/* Quick Start Steps */}
      <div className="bg-linear-to-r from-primary/10 to-blue-50 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🚀 Quick Start (3 Steps)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
            <h3 className="font-semibold text-gray-900 mb-2">Connect RSS</h3>
            <p className="text-gray-600 text-sm">Add your podcast feed URL</p>
          </div>
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
            <h3 className="font-semibold text-gray-900 mb-2">Run Analysis</h3>
            <p className="text-gray-600 text-sm">Upload transcript or analyze episode</p>
          </div>
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
            <h3 className="font-semibold text-gray-900 mb-2">Repurpose</h3>
            <p className="text-gray-600 text-sm">Generate social media & email content</p>
          </div>
        </div>
      </div>

      {/* Step-by-Step Guide */}
      <div className="space-y-12">
        {/* Step 1: Login */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="flex items-start">
            <div className="bg-green-100 rounded-lg p-3 mr-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Login & Set Password</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 mb-2">1. Check your email for the invite link</p>
                  <p className="text-gray-700 mb-2">2. Click the link to access LoquiHQ</p>
                  <p className="text-gray-700 mb-2">3. Set a secure password (minimum 8 characters)</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Use a password manager to generate and store your password securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Connect RSS */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="flex items-start">
            <div className="bg-blue-100 rounded-lg p-3 mr-6">
              <Link className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 2: Connect Your Podcast</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 mb-3">Navigate to the "Connect Podcast" page and paste your RSS feed URL.</p>
                  <h4 className="font-semibold text-gray-900 mb-2">Where to find your RSS URL:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">🎙️ Popular Platforms</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Buzzsprout: Your show page → RSS Feed</li>
                        <li>• Libsyn: Distribution → RSS Feed</li>
                        <li>• Transistor: Show settings → RSS Feed</li>
                        <li>• Anchor: Distribution → RSS Feed</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">🔍 How to Find It</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Usually ends in .xml or /feed</li>
                        <li>• Contains "rss" or "feed" in URL</li>
                        <li>• Ask your host if you can't find it</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Success:</strong> You'll see your podcast details load automatically, including episode count and latest episode date.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Run Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="flex items-start">
            <div className="bg-purple-100 rounded-lg p-3 mr-6">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 3: Run Your First Analysis</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 mb-3">Choose how you want to analyze your content:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-600" />
                        Upload Transcript
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">Already have a transcript? Upload it directly.</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Supports .txt, .docx, .pdf</li>
                        <li>• Up to 50MB file size</li>
                        <li>• Automatic formatting</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <Play className="h-5 w-5 mr-2 text-green-600" />
                        Audio Analysis
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">Let us transcribe and analyze your audio.</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Supports .mp3, .wav, .m4a</li>
                        <li>• Up to 2GB file size</li>
                        <li>• Automatic transcription</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>What happens next:</strong> AI analyzes your content for 2-5 minutes, then you get a comprehensive dashboard with insights, metrics, and repurposing suggestions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Repurpose Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="flex items-start">
            <div className="bg-orange-100 rounded-lg p-3 mr-6">
              <Share2 className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 4: Repurpose Your Content</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 mb-3">Turn your analysis into ready-to-publish content:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h5 className="font-medium text-gray-900">Email</h5>
                      <p className="text-xs text-gray-600">Newsletter series</p>
                    </div>
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <Twitter className="h-8 w-8 text-sky-600 mx-auto mb-2" />
                      <h5 className="font-medium text-gray-900">X</h5>
                      <p className="text-xs text-gray-600">Thread posts</p>
                    </div>
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <Youtube className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <h5 className="font-medium text-gray-900">YouTube</h5>
                      <p className="text-xs text-gray-600">Video scripts</p>
                    </div>
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <h5 className="font-medium text-gray-900">Blog</h5>
                      <p className="text-xs text-gray-600">Articles</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Pro tip:</strong> Schedule individual social posts using the Platform Content scheduler for LinkedIn, Twitter, Medium, and newsletters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What Success Looks Like */}
      <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-lg p-8 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 What Success Looks Like</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Your Dashboard Will Show:</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Content performance metrics</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Audience engagement insights</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Monetization recommendations</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Ready-to-publish content</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">You'll Be Able To:</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Understand what content works</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Plan better episodes</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Maximize sponsorship revenue</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                <span className="text-gray-700">Save hours on content creation</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Need Help */}
      <div className="bg-gray-50 rounded-lg p-8 mt-12 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Need Help?</h3>
        <p className="text-gray-600 mb-4">
          Having trouble? Check our <a href="/known-issues" className="text-primary hover:underline">known issues</a> page or contact us.
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="mailto:beta-support@loquihq.com"
            className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <Mail className="h-5 w-5 mr-2" />
            Get Support
          </a>
          <a
            href="/beta-feedback"
            className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Share Feedback
          </a>
        </div>
      </div>
    </div>
  );
};

export default BetaGuide;