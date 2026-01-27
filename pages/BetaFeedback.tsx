import React, { useState } from 'react';
import { Bug, Lightbulb, DollarSign, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface FeedbackFormData {
  type: 'bug' | 'feature' | 'pricing';
  title: string;
  description: string;
  expected?: string;
  device?: string;
  browser?: string;
  priceRange?: string;
  wouldPay?: boolean;
}

const BetaFeedback: React.FC = () => {
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'bug',
    title: '',
    description: '',
    expected: '',
    device: '',
    browser: '',
    priceRange: '',
    wouldPay: undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // In a real app, this would send to your backend
      // For now, we'll just simulate the submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send email or save to database
      const feedbackData = {
        ...formData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      console.log('Feedback submitted:', feedbackData);

      // Here you would typically send to your backend:
      // await fetch('/api/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(feedbackData)
      // });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FeedbackFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-lg text-gray-600 mb-8">
            Your feedback has been submitted successfully. We appreciate you helping us improve LoquiHQ.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                type: 'bug',
                title: '',
                description: '',
                expected: '',
                device: '',
                browser: '',
                priceRange: '',
                wouldPay: undefined
              });
            }}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 light">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Beta Feedback</h1>
        <p className="text-gray-600">
          Help us build the best podcast intelligence platform. Your feedback is invaluable.
        </p>
      </div>

      {/* Feedback Type Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">What type of feedback do you have?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleInputChange('type', 'bug')}
            className={`p-4 border rounded-lg text-left transition ${
              formData.type === 'bug'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Bug className="h-6 w-6 text-red-600 mb-2" />
            <h3 className="font-medium text-gray-900">Bug Report</h3>
            <p className="text-sm text-gray-600">Something isn't working</p>
          </button>
          <button
            onClick={() => handleInputChange('type', 'feature')}
            className={`p-4 border rounded-lg text-left transition ${
              formData.type === 'feature'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Lightbulb className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Feature Request</h3>
            <p className="text-sm text-gray-600">I'd like to see this feature</p>
          </button>
          <button
            onClick={() => handleInputChange('type', 'pricing')}
            className={`p-4 border rounded-lg text-left transition ${
              formData.type === 'pricing'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <DollarSign className="h-6 w-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Pricing Feedback</h3>
            <p className="text-sm text-gray-600">What would you pay?</p>
          </button>
        </div>
      </div>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        {/* Title */}
        <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            {formData.type === 'bug' ? 'What happened?' : formData.type === 'feature' ? 'What do you want to do?' : 'Subject'}
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder={formData.type === 'bug' ? 'Brief description of the issue' : formData.type === 'feature' ? 'What feature would you like?' : 'Feedback subject'}
            required
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            {formData.type === 'bug' ? 'Describe what happened' : formData.type === 'feature' ? 'Tell us more about this feature' : 'Your thoughts'}
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder={
              formData.type === 'bug'
                ? 'Please provide as much detail as possible. What were you trying to do? What did you see instead?'
                : formData.type === 'feature'
                ? 'Describe the feature you want and how you would use it.'
                : 'Share your thoughts on pricing and value.'
            }
            required
          />
        </div>

        {/* Bug-specific fields */}
        {formData.type === 'bug' && (
          <>
            <div className="mb-6">
              <label htmlFor="expected" className="block text-sm font-medium text-gray-700 mb-2">
                What did you expect to happen?
              </label>
              <textarea
                id="expected"
                value={formData.expected}
                onChange={(e) => handleInputChange('expected', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="What should have happened instead?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="device" className="block text-sm font-medium text-gray-700 mb-2">
                  Device
                </label>
                <select
                  id="device"
                  value={formData.device}
                  onChange={(e) => handleInputChange('device', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select device</option>
                  <option value="desktop">Desktop Computer</option>
                  <option value="laptop">Laptop</option>
                  <option value="tablet">Tablet</option>
                  <option value="phone">Mobile Phone</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="browser" className="block text-sm font-medium text-gray-700 mb-2">
                  Browser
                </label>
                <select
                  id="browser"
                  value={formData.browser}
                  onChange={(e) => handleInputChange('browser', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select browser</option>
                  <option value="chrome">Chrome</option>
                  <option value="firefox">Firefox</option>
                  <option value="safari">Safari</option>
                  <option value="edge">Edge</option>
                  <option value="opera">Opera</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Pricing-specific fields */}
        {formData.type === 'pricing' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Would you pay for LoquiHQ?
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="wouldPay"
                  value="yes"
                  checked={formData.wouldPay === true}
                  onChange={() => handleInputChange('wouldPay', true)}
                  className="text-primary focus:ring-primary"
                />
                <span className="ml-2 text-gray-700">Yes, I'd pay for this</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="wouldPay"
                  value="no"
                  checked={formData.wouldPay === false}
                  onChange={() => handleInputChange('wouldPay', false)}
                  className="text-primary focus:ring-primary"
                />
                <span className="ml-2 text-gray-700">No, I wouldn't pay</span>
              </label>
            </div>

            {formData.wouldPay === true && (
              <div className="mt-4">
                <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700 mb-2">
                  What's your price range?
                </label>
                <select
                  id="priceRange"
                  value={formData.priceRange}
                  onChange={(e) => handleInputChange('priceRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select price range</option>
                  <option value="$10-25">Free or $10-25/month</option>
                  <option value="$26-50">$26-50/month</option>
                  <option value="$51-100">$51-100/month</option>
                  <option value="$100+">$100+/month</option>
                  <option value="yearly">I'd prefer yearly pricing</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="text-center mt-8 text-sm text-gray-600">
        <p>
          Your feedback helps us build a better product. Thank you for being part of the LoquiHQ beta!
        </p>
      </div>
    </div>
  );
};

export default BetaFeedback;