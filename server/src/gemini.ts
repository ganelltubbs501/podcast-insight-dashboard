import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("GEMINI_API_KEY loaded?", !!process.env.GEMINI_API_KEY);
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
};

/**
 * Retry helper with exponential backoff for transient errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable (503, 429, or network errors)
      const errorMessage = error?.message || JSON.stringify(error);
      const isRetryable =
        errorMessage.includes("503") ||
        errorMessage.includes("overloaded") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("RESOURCE_EXHAUSTED");

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms due to: ${errorMessage.substring(0, 100)}`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function analyzeWithGemini(payload: {
  contentInput: string | { inlineData: { mimeType: string; data: string } };
  settings?: any;
}) {
  const ai = getClient();

  // ✅ CHANGE: use a model confirmed to support generateContent
  // (and allow an env override without changing code later)
  const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const fallbackModelId = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash";

  // Keep your system prompt logic (copied from your frontend)
  let systemInstruction =
    "You are an expert podcast analyst, content strategist, and SEO specialist. Your goal is to extract deep insights, create platform-specific viral content, and provide structured analytics.";

  const s = payload.settings;
  if (s) {
    if (s.accuracyLevel === "High")
      systemInstruction += " Perform a detailed analysis, ensuring no nuance is missed.";
    else if (s.accuracyLevel === "Maximum")
      systemInstruction +=
        " Perform an exhaustive, critically detailed analysis. Prioritize depth over brevity.";

    if (s.toneFilter && s.toneFilter !== "Auto")
      systemInstruction += ` Analyze the content specifically focusing on ${s.toneFilter} language patterns and nuances.`;
    if (s.language && s.language !== "Auto")
      systemInstruction += ` The content language is ${s.language}. Ensure all output is in this language unless specified otherwise.`;
    if (s.sensitiveContentFilter)
      systemInstruction +=
        " Please flag and treat sensitive topics with care, using neutral language where appropriate.";
    if (s.dialectContext)
      systemInstruction += ` Note: The speakers may use ${s.dialectContext} dialect or idioms. Interpret accordingly.`;
  }

  let textPrompt =
    "Analyze the following podcast content (text, audio, or image of notes) and generate a comprehensive set of insights, content, and analytics.";

  if (s?.customKeywords?.length) {
    textPrompt += ` IMPORTANT: Pay special attention to the following industry keywords and highlight them in the analysis if relevant: ${s.customKeywords.join(", ")}.`;
  }

  const parts: any[] = [{ text: textPrompt }];

  if (typeof payload.contentInput === "string") {
    parts.push({ text: `TRANSCRIPT:\n${payload.contentInput.substring(0, 45000)}` });
  } else {
    parts.push({ inlineData: payload.contentInput.inlineData });
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
      quotes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            timestamp: { type: Type.STRING },
            speaker: { type: Type.STRING },
          },
        },
      },
      socialClips: { type: Type.ARRAY, items: { type: Type.STRING } },
      socialContent: {
        type: Type.OBJECT,
        properties: {
          linkedinPost: { type: Type.STRING },
          twitterThread: { type: Type.ARRAY, items: { type: Type.STRING } },
          tiktokScript: { type: Type.STRING },
          youtubeDescription: { type: Type.STRING },
          emailNewsletter: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
            },
            required: ["subject", "body"],
          },
          mediumArticle: { type: Type.STRING },
          newsletterTeaser: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
            },
            required: ["subject", "body"],
          },
          facebookPost: { type: Type.STRING },
        },
        required: [
          "linkedinPost",
          "twitterThread",
          "tiktokScript",
          "youtubeDescription",
          "emailNewsletter",
          "mediumArticle",
          "newsletterTeaser",
          "facebookPost",
        ],
      },
      blogPost: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          intro: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                content: { type: Type.STRING },
              },
            },
          },
          conclusion: { type: Type.STRING },
        },
      },
      showNotes: { type: Type.STRING },
      faq: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
        },
      },
      seo: {
        type: Type.OBJECT,
        properties: {
          metaDescription: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          titleVariations: { type: Type.ARRAY, items: { type: Type.STRING } },
          keywordAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                keyword: { type: Type.STRING },
                count: { type: Type.NUMBER },
                density: { type: Type.STRING },
              },
            },
          },
          readability: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              level: { type: Type.STRING },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          internalLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
      speakers: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            contribution: { type: Type.STRING },
            speakingTimePercent: { type: Type.NUMBER },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
      sentiment: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          label: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative", "Mixed"] },
          tone: { type: Type.STRING },
          audiencePrediction: { type: Type.STRING },
          emotionalKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
                score: { type: Type.NUMBER },
              },
            },
          },
        },
      },
    },
    required: [
      "keyTakeaways",
      "quotes",
      "socialClips",
      "socialContent",
      "blogPost",
      "showNotes",
      "faq",
      "seo",
      "speakers",
      "sentiment",
    ],
  };

  const generateWithModel = (model: string) =>
    retryWithBackoff(() =>
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      })
    );

  let response: GenerateContentResponse;
  try {
    response = await generateWithModel(modelId);
  } catch (error: any) {
    const errorMessage = error?.message || JSON.stringify(error);
    const isModelUnavailable =
      errorMessage.includes("404") ||
      errorMessage.includes("NOT_FOUND") ||
      errorMessage.toLowerCase().includes("model") && errorMessage.toLowerCase().includes("not found");

    if (isModelUnavailable && fallbackModelId && fallbackModelId !== modelId) {
      console.warn(`Primary Gemini model unavailable (${modelId}). Falling back to ${fallbackModelId}.`);
      response = await generateWithModel(fallbackModelId);
    } else {
      throw error;
    }
  }

  const text = response.text;
  if (!text) throw new Error("No response from Gemini.");

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("FAILED TO PARSE JSON. RAW OUTPUT:", text);
    throw e;
  }
}

export async function repurposeWithGemini(payload: { type: string; context: string }) {
  const ai = getClient();
  const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const systemInstruction = `You are an expert content repurposer. Given a transcript and analysis context, generate platform-optimized repurposed content.

CRITICAL VOICE & PERSONALIZATION RULES:
- Write ALL content in FIRST PERSON from the perspective of the podcast host. Use "I", "my", "me" — NOT "they", "their", or third-person references to the host.
  Example: "I dive deep into..." NOT "John dives deep into..."
  Example: "my new podcast" NOT "John's new podcast"
- NEVER use placeholder brackets like [Your Name], [Podcast Name], [Host Name], or any [bracketed text]. This is an absolute rule with zero exceptions.
- If the context includes "Host/Author Name:", use that exact name for email sign-offs (e.g., "Best,\nGanell"). Otherwise use a generic sign-off like "Best regards" with no name.
- Use the actual podcast name from the transcript context, never a bracketed placeholder.

IMPORTANT FORMATTING RULES:
- For emailSeries: Generate 5 emails with day values 1, 2, 3, 4, 5 (one email per day). Each email should be sent on a different day.
- For socialCalendar: Generate 25 social media posts (5 posts per day for 5 days). Each day should have one post for each platform: Instagram, Facebook, LinkedIn, Twitter, and Instagram Stories. Structure:
  * Day 1: Instagram (day: 1), Facebook (day: 1), LinkedIn (day: 1), Twitter (day: 1), Instagram Stories (day: 1)
  * Day 2: Instagram (day: 2), Facebook (day: 2), LinkedIn (day: 2), Twitter (day: 2), Instagram Stories (day: 2)
  * Day 3: Instagram (day: 3), Facebook (day: 3), LinkedIn (day: 3), Twitter (day: 3), Instagram Stories (day: 3)
  * Day 4: Instagram (day: 4), Facebook (day: 4), LinkedIn (day: 4), Twitter (day: 4), Instagram Stories (day: 4)
  * Day 5: Instagram (day: 5), Facebook (day: 5), LinkedIn (day: 5), Twitter (day: 5), Instagram Stories (day: 5)
- The "day" field indicates which day the content should be scheduled (day 1 = first day, day 2 = second day, etc.)
- Optimize each post for its specific platform (character limits, tone, hashtags, etc.)
- For facebookPost: slightly longer than X, include a hook + value + CTA, include 1–3 hashtags, and at most 1 emoji (or none).

Return ONLY JSON matching the responseSchema.`;

  // Map type to the specific field name Gemini should populate
  const typeToField: Record<string, string> = {
    'email_series': 'emailSeries',
    'social_calendar': 'socialCalendar',
    'linkedin_article': 'linkedinArticle',
    'facebook_post': 'facebookPost',
    'image_prompts': 'imagePrompts',
  };
  const fieldName = typeToField[payload.type] || payload.type;

  const parts: any[] = [
    { text: `Generate ONLY the "${fieldName}" field. Repurpose Type: ${payload.type}` },
    { text: `Context:\n${payload.context.substring(0, 45000)}` },
    { text: `IMPORTANT: You MUST populate the "${fieldName}" field with content. Do not leave it empty.` }
  ];

  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          emailSeries: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                subject: { type: Type.STRING },
                body: { type: Type.STRING },
                goal: { type: Type.STRING },
              },
            },
          },
          socialCalendar: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                platform: { type: Type.STRING },
                type: { type: Type.STRING },
                content: { type: Type.STRING },
              },
            },
          },
          linkedinArticle: { type: Type.STRING },
          facebookPost: { type: Type.STRING },
          imagePrompts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                quote: { type: Type.STRING },
                prompt: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  }));

  const text = response.text;
  if (!text) throw new Error("No response from Gemini.");

  try {
    const parsed = JSON.parse(text);
    console.log(`📝 Repurpose (${payload.type}) result keys:`, Object.keys(parsed));
    console.log(`📝 emailSeries length:`, parsed.emailSeries?.length ?? 'undefined');
    console.log(`📝 socialCalendar length:`, parsed.socialCalendar?.length ?? 'undefined');
    return parsed;
  } catch (e) {
    console.error("FAILED TO PARSE REPURPOSE JSON. RAW OUTPUT:", text);
    throw e;
  }
}

export async function generateSponsorshipWithGemini(payload: {
  transcriptContext: string;
  researchPack: any;
}) {
  const ai = getClient();
  const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const systemInstruction = `You are an expert podcast monetization strategist with deep knowledge of the creator economy, ad market dynamics, and brand partnerships.

Your role is to analyze podcast content and match it with relevant sponsors based on:
- PRIMARILY: The specific episode content, topics, audience insights, and unique value proposition
- SECONDARILY: General market data from the research pack (CPM benchmarks, sponsor categories, platform trends)

CRITICAL INSTRUCTIONS:
1. Analyze the TRANSCRIPT CONTEXT carefully to understand the specific niche, topics, and audience
2. Match sponsors based on TOPICAL RELEVANCE to this specific episode, not just generic categories
3. Consider what sponsors would authentically fit this show's content and audience
4. Use the research pack as a reference for sponsor categories and market rates, but CUSTOMIZE recommendations to this specific content
5. Different episodes should get DIFFERENT sponsor recommendations based on their unique content
6. Provide specific reasoning for each sponsor match based on the actual episode topics discussed

Return ONLY valid JSON matching the responseSchema. Be highly specific about WHY each sponsor matches THIS particular episode's content.`;

  // Extract live metrics if available
  const liveMetrics = payload.researchPack?.liveEnrichment?.metrics;
  const metricsContext = liveMetrics
    ? `\n\nLIVE PODCAST METRICS (Use these realistic estimates in your recommendations):
- Estimated Downloads per Episode: ${liveMetrics.estimatedDownloads.toLocaleString()}
- Realistic CPM Rate: $${liveMetrics.estimatedCPM}
- Confidence: ${liveMetrics.confidence}
- Based on: ${liveMetrics.reasoning}

IMPORTANT: Use these metrics in your estimatedMetrics response. Do NOT use generic 10,000 download assumptions.`
    : '\n\nNOTE: No live metrics available. Use conservative estimates (1,000-3,000 downloads, $18-25 CPM for new shows).';

  const parts: any[] = [
    { text: `EPISODE-SPECIFIC CONTEXT (Analyze this FIRST to understand what this episode is about):\n${payload.transcriptContext.substring(0, 30000)}` },
    { text: metricsContext },
    { text: `\n\nREFERENCE DATA - Sponsor Categories & Market Rates (Use ONLY as a reference for available sponsors and pricing):\n${JSON.stringify(payload.researchPack, null, 2).substring(0, 15000)}` },
    { text: `\n\nTASK: Based on the SPECIFIC topics, themes, and audience of THIS episode, recommend sponsors that would be a natural, authentic fit. Match sponsors to the actual content discussed, not just generic categories. Explain WHY each sponsor fits THIS particular episode's content. Use the LIVE METRICS provided above for realistic revenue estimates. Different episodes with different topics should get different sponsor recommendations.` }
  ];

  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: {
            type: Type.NUMBER,
            description: "Sponsorship readiness score 0-100 based on content quality, niche clarity, and market demand"
          },
          reasoning: {
            type: Type.STRING,
            description: "2-3 sentence explanation of the score, citing market conditions from research pack"
          },
          estimatedMetrics: {
            type: Type.OBJECT,
            description: "Realistic estimates for this show based on available data",
            properties: {
              downloadsPerEpisode: {
                type: Type.NUMBER,
                description: "Estimated downloads per episode based on similar shows and available data"
              },
              realisticCPM: {
                type: Type.NUMBER,
                description: "Realistic CPM rate for this show's niche and audience size"
              },
              confidence: {
                type: Type.STRING,
                enum: ["low", "medium", "high"],
                description: "Confidence level in these estimates"
              },
              basedOn: {
                type: Type.STRING,
                description: "Brief explanation of what data these estimates are based on"
              }
            },
            required: ["downloadsPerEpisode", "realisticCPM", "confidence", "basedOn"]
          },
          suggestedSponsors: {
            type: Type.ARRAY,
            description: "3-5 sponsor categories with specific brand recommendations from the research pack",
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "Sponsor category (must match research pack categories)" },
                brands: {
                  type: Type.ARRAY,
                  description: "3-6 specific brand names from the research pack sponsor database",
                  items: { type: Type.STRING }
                },
                matchReason: {
                  type: Type.STRING,
                  description: "Why this category/brands match the episode content and audience. Be specific about alignment."
                },
                estimatedCPM: {
                  type: Type.STRING,
                  description: "CPM range based on research pack benchmarks (e.g. '$20-35 CPM')"
                },
                typicalDeal: {
                  type: Type.STRING,
                  description: "Expected deal structure from research pack (e.g. '60s host-read, multi-episode commitment')"
                }
              },
              required: ["category", "brands", "matchReason", "estimatedCPM"]
            }
          },
          targetAudienceProfile: {
            type: Type.STRING,
            description: "Detailed audience profile (demographics, psychographics, interests) that makes this content sponsor-ready"
          },
          potentialAdSpots: {
            type: Type.ARRAY,
            description: "3-5 specific timestamp suggestions for ad placement with context",
            items: { type: Type.STRING }
          },
          platformRecommendations: {
            type: Type.OBJECT,
            description: "Monetization opportunities by platform based on research pack insights",
            properties: {
              podcast: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  cpmRange: { type: Type.STRING },
                  notes: { type: Type.STRING }
                }
              },
              youtube: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  cpmRange: { type: Type.STRING },
                  notes: { type: Type.STRING }
                }
              },
              newsletter: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  cpmRange: { type: Type.STRING },
                  notes: { type: Type.STRING }
                }
              }
            }
          },
          actionableNextSteps: {
            type: Type.ARRAY,
            description: "3-5 specific action items to land sponsors (e.g. 'Create media kit', 'Reach out to X via Y')",
            items: { type: Type.STRING }
          },
          dataSources: {
            type: Type.ARRAY,
            description: "List all data sources used from the research pack",
            items: { type: Type.STRING }
          }
        },
        required: [
          "score",
          "reasoning",
          "estimatedMetrics",
          "suggestedSponsors",
          "targetAudienceProfile",
          "potentialAdSpots",
          "platformRecommendations",
          "actionableNextSteps",
          "dataSources"
        ]
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("No response from Gemini for sponsorship generation.");

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("FAILED TO PARSE SPONSORSHIP JSON. RAW OUTPUT:", text);
    throw e;
  }
}

// ============================================================================
// TRUTH-BASED MONETIZATION GENERATION (with manual input + confidence)
// ============================================================================

export async function generateTruthBasedMonetization(payload: {
  transcriptContext: string;
  processedMetrics: any;
  researchPack: any;
}) {
  const { transcriptContext, processedMetrics, researchPack } = payload;

  const ai = getClient();
  const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const prompt = `You are a monetization strategist analyzing a podcast for revenue opportunities.

You have REAL DATA with confidence levels. Use this to tell the creator the TRUTH about their monetization status.

## PODCAST METRICS (Confidence-Weighted)

${processedMetrics.dataConfidence.map((d: any) =>
  `- ${d.label}: ${typeof d.value === 'number' && d.value > 1000 ? d.value.toLocaleString() : d.value} [${d.confidence === 'verified' ? '🟢 VERIFIED' : d.confidence === 'estimated' ? '🟡 ESTIMATED' : '🔴 UNKNOWN'}] (${d.source})`
).join('\n')}

Overall Confidence: ${processedMetrics.overallConfidence.toUpperCase()}

## CURRENT STATUS

- Current Monthly Revenue: $${processedMetrics.currentRevenue.toLocaleString()}
- Monetization Methods: ${processedMetrics.monetizationMethods.join(', ') || 'None'}
${processedMetrics.revenueGoal ? `- Revenue Goal: $${processedMetrics.revenueGoal.toLocaleString()}/month` : ''}
${processedMetrics.timeline ? `- Timeline: ${processedMetrics.timeline}` : ''}

## EPISODE CONTEXT (for sponsor matching)

${transcriptContext.substring(0, 2000)}

## MARKET DATA (Research Pack)

CPM Benchmarks:
- Podcast: $${researchPack.cpmBenchmarks.podcast.min}-${researchPack.cpmBenchmarks.podcast.max} (avg $${researchPack.cpmBenchmarks.podcast.average})
- YouTube: $${researchPack.cpmBenchmarks.youtube.min}-${researchPack.cpmBenchmarks.youtube.max} (avg $${researchPack.cpmBenchmarks.youtube.average})
- Newsletter: $${researchPack.cpmBenchmarks.newsletter.min}-${researchPack.cpmBenchmarks.newsletter.max} (avg $${researchPack.cpmBenchmarks.newsletter.average})

Market Conditions: ${researchPack.marketConditions.summary}

Sponsor Database: ${researchPack.sponsorDatabase.totalBrands} brands across ${researchPack.sponsorDatabase.categories.length} categories

## YOUR TASK

Generate a TRUTH-BASED monetization analysis. No motivational fluff. Just facts.

1. **Calculate Under-Monetization**: Based on verified/estimated metrics, what SHOULD this podcast be making per episode? Compare to current revenue.

2. **Readiness Score**: Use the calculated readiness analysis. The system has already analyzed their execution capability:

Overall Readiness: ${processedMetrics.readinessAnalysis?.score || 0}/100
Strengths: ${processedMetrics.readinessAnalysis?.strengths?.join('; ') || 'None identified'}
Blockers: ${processedMetrics.readinessAnalysis?.blockers?.join('; ') || 'None identified'}

Strategy-Specific Readiness:
- Sponsorship: ${processedMetrics.strategyReadiness?.sponsorship || 0}/100
- Product: ${processedMetrics.strategyReadiness?.product || 0}/100
- Affiliate: ${processedMetrics.strategyReadiness?.affiliate || 0}/100
- Membership: ${processedMetrics.strategyReadiness?.membership || 0}/100

Use the OVERALL score for the main readiness field, and use strategy-specific scores for each recommendation's readiness.

3. **Episode-Specific Sponsor Matches**: Based on THIS episode's content, match 3-6 specific brands from the research pack. Be topically relevant, not generic.

4. **Truth Statement**: One sentence that cuts through BS. Examples:
   - "You're under-monetized by $347/episode. You have the audience, you're just not asking."
   - "You don't have an audience size problem. You have a sponsor outreach problem."
   - "Your downloads are too low for direct deals. Focus on affiliate first."

5. **Next Best Move**: NOT "grow your downloads." Tell them the ONE thing to do next based on their actual data. Examples:
   - "NOT more downloads. You need ONE sponsor at $25 CPM. Reach out to [Brand X]."
   - "Build an email list first. Your podcast ads are working but you're leaving 60% of value on the table."
   - "You're ready for sponsors NOW. Create a one-page media kit and pitch these 3 brands."

6. **Why This Works Now**: 2-3 bullet points explaining why this recommendation is RIGHT for their current status (not aspirational).

Be brutally honest. If they're not ready, say so. If they're leaving money on the table, quantify it exactly.`;

  const response = await retryWithBackoff(() => ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          currentRevenue: {
            type: Type.NUMBER,
            description: "Current monthly revenue from podcast"
          },
          potentialRevenue: {
            type: Type.NUMBER,
            description: "What they SHOULD be making with their current metrics"
          },
          underMonetizedBy: {
            type: Type.NUMBER,
            description: "Dollar amount per episode they're leaving on the table"
          },
          readinessScore: {
            type: Type.NUMBER,
            description: "0-100 score for monetization readiness (be honest)"
          },
          dataConfidence: {
            type: Type.ARRAY,
            description: "Pass through the data confidence array from input",
            items: {
              type: Type.OBJECT,
              properties: {
                field: { type: Type.STRING },
                label: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["verified", "estimated", "unknown"] },
                source: { type: Type.STRING },
                value: { type: Type.STRING }
              }
            }
          },
          overallConfidence: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
            description: "Overall data confidence level"
          },
          recommendations: {
            type: Type.ARRAY,
            description: "Ranked recommendations by priority and readiness",
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ["sponsorship", "product", "affiliate", "membership", "other"]
                },
                priority: {
                  type: Type.STRING,
                  enum: ["immediate", "short-term", "medium-term", "long-term"]
                },
                estimatedRevenue: {
                  type: Type.NUMBER,
                  description: "Monthly revenue potential"
                },
                effort: {
                  type: Type.STRING,
                  enum: ["low", "medium", "high"]
                },
                readiness: {
                  type: Type.NUMBER,
                  description: "0-100 readiness score for THIS strategy"
                },
                reasoning: {
                  type: Type.STRING,
                  description: "Why this recommendation, based on their actual data"
                },
                nextSteps: {
                  type: Type.ARRAY,
                  description: "Specific action items",
                  items: { type: Type.STRING }
                }
              },
              required: ["type", "priority", "estimatedRevenue", "effort", "readiness", "reasoning", "nextSteps"]
            }
          },
          suggestedSponsors: {
            type: Type.ARRAY,
            description: "Episode-specific sponsor matches from research pack (3-6 brands)",
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                brands: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                matchReason: {
                  type: Type.STRING,
                  description: "Why THIS episode matches these brands (be specific)"
                },
                estimatedCPM: { type: Type.STRING }
              },
              required: ["category", "brands", "matchReason", "estimatedCPM"]
            }
          },
          truthStatement: {
            type: Type.STRING,
            description: "One brutally honest sentence about their monetization status"
          },
          nextBestMove: {
            type: Type.STRING,
            description: "The ONE thing to do next (not 'grow downloads'). Be specific."
          },
          whyThisWorksNow: {
            type: Type.ARRAY,
            description: "2-3 bullet points: why this recommendation fits their CURRENT status",
            items: { type: Type.STRING }
          }
        },
        required: [
          "currentRevenue",
          "potentialRevenue",
          "underMonetizedBy",
          "readinessScore",
          "dataConfidence",
          "overallConfidence",
          "recommendations",
          "suggestedSponsors",
          "truthStatement",
          "nextBestMove",
          "whyThisWorksNow"
        ]
      }
    }
  })) as GenerateContentResponse;

  const text = response.text;
  if (!text) throw new Error("No response from Gemini for truth-based monetization.");

  try {
    const parsed = JSON.parse(text);
    // Add the input metrics for reference
    parsed.metrics = processedMetrics.metrics;
    return parsed;
  } catch (e) {
    console.error("FAILED TO PARSE TRUTH-BASED MONETIZATION JSON. RAW OUTPUT:", text);
    throw e;
  }
}

/**
 * AI Chat Assistant - Provides intelligent, context-aware responses
 */
export async function chatWithGemini(payload: {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  pageContext?: {
    currentPage?: string;
    transcriptData?: any;
    userData?: any;
  };
}) {
  const ai = getClient();
  const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const systemInstruction = `You are an expert AI assistant for LoquiHQ, a podcast performance and monetization intelligence platform. Your role is to help podcasters understand and use the platform effectively.

ABOUT LOQUIHQ:
- LoquiHQ analyzes podcast transcripts to provide actionable insights
- Features: Transcript analysis, social content generation, blog posts, SEO optimization, repurposing content, monetization strategies, guest outreach, and more
- Tagline: "Where podcasters get the truth."
- Mission: Stop guessing, read the signal - provide clear answers, not vanity metrics

YOUR CAPABILITIES:
1. Answer questions about platform features and how to use them
2. Provide guidance on podcast growth strategies
3. Help interpret analysis results and metrics
4. Suggest best practices for content repurposing
5. Offer monetization advice based on podcast performance data
6. Answer questions about sponsorships, CPM rates, and revenue optimization

RESPONSE STYLE:
- Be concise, friendly, and actionable
- Use the user's current context to provide relevant answers
- When discussing features, explain how they help achieve business goals
- Back up advice with data or best practices when possible
- If you don't have specific information, provide general guidance and suggest where to find more details

IMPORTANT RULES:
- Always provide accurate information about LoquiHQ features
- If asked about pricing or billing, direct users to the settings or contact support
- When discussing analytics, focus on actionable insights rather than vanity metrics
- Encourage users to treat their podcast like a business`;

  // Build context string from page data
  let contextString = '';
  if (payload.pageContext) {
    const { currentPage, transcriptData, userData } = payload.pageContext;

    if (currentPage) {
      contextString += `\n\nCURRENT PAGE: ${currentPage}`;
    }

    if (transcriptData) {
      contextString += `\n\nCURRENT TRANSCRIPT DATA:`;
      if (transcriptData.title) contextString += `\nTitle: ${transcriptData.title}`;
      if (transcriptData.result?.keyTakeaways) {
        contextString += `\nKey Takeaways: ${transcriptData.result.keyTakeaways.slice(0, 3).join(', ')}`;
      }
      if (transcriptData.result?.speakers) {
        contextString += `\nSpeakers: ${transcriptData.result.speakers.map((s: any) => s.name).join(', ')}`;
      }
    }

    if (userData) {
      if (userData.name) contextString += `\n\nUser: ${userData.name}`;
    }
  }

  // Build conversation contents
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Add conversation history if provided
  if (payload.conversationHistory && payload.conversationHistory.length > 0) {
    contents.push(...payload.conversationHistory);
  }

  // Add current user message with context
  const userMessage = contextString
    ? `${contextString}\n\nUSER QUESTION: ${payload.message}`
    : payload.message;

  contents.push({
    role: "user" as const,
    parts: [{ text: userMessage }]
  });

  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    })
  );

  const text = response.text;
  if (!text) throw new Error("No response from Gemini chat.");

  return { response: text };
}

/**
 * Suggest potential podcast guests based on episode context
 */
export async function suggestGuestsWithGemini(context: string): Promise<{
  id: string;
  name: string;
  title: string;
  bio: string;
  expertise: string[];
  status: string;
  matchReason: string;
}[]> {
  const ai = getClient();
  const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const prompt = `You are an expert podcast guest researcher. Based on the following episode context, suggest 3-5 REAL, specific experts who would be excellent podcast guests.

EPISODE CONTEXT:
${context}

IMPORTANT GUIDELINES:
1. Suggest REAL people who are publicly known experts in the relevant field
2. Include their actual title/role and a brief accurate bio
3. Explain specifically why they'd be a good fit for THIS episode's topics
4. Focus on people who:
   - Are active speakers/authors/thought leaders
   - Have publicly available contact info or are reachable through LinkedIn
   - Would bring unique insights to the topics discussed
5. Mix different types: academics, practitioners, authors, entrepreneurs, etc.

Return suggestions as a JSON array with this exact structure for each guest.`;

  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Full name of the suggested guest"
              },
              title: {
                type: Type.STRING,
                description: "Current job title or role"
              },
              bio: {
                type: Type.STRING,
                description: "Brief bio (2-3 sentences) about their expertise and background"
              },
              expertise: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 3-5 areas of expertise"
              },
              matchReason: {
                type: Type.STRING,
                description: "Specific reason why they'd be great for THIS episode's topics"
              }
            },
            required: ["name", "title", "bio", "expertise", "matchReason"]
          }
        }
      }
    })
  );

  const text = response.text;
  if (!text) throw new Error("No response from Gemini for guest suggestions.");

  const suggestions = JSON.parse(text);

  // Add id and status to each suggestion
  return suggestions.map((guest: any, index: number) => ({
    id: `suggested-${Date.now()}-${index}`,
    name: guest.name,
    title: guest.title,
    bio: guest.bio,
    expertise: guest.expertise || [],
    status: 'Suggested',
    matchReason: guest.matchReason
  }));
}

/**
 * Generate a personalized outreach email for a potential podcast guest
 */
export async function generateOutreachEmail(payload: {
  guestName: string;
  guestBio: string;
  context: string;
  podcastName?: string;
  hostName?: string;
}): Promise<{ subject: string; body: string }> {
  const ai = getClient();
  const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const { guestName, guestBio, context, podcastName, hostName } = payload;

  const systemPrompt = `You are an expert at writing personalized, professional podcast guest outreach emails. Your emails are:
- Warm and genuine, not salesy or generic
- Specific to the guest's background and expertise
- Clear about why they'd be a great fit
- Concise (under 200 words for the body)
- Professional but conversational in tone

IMPORTANT: Do NOT use placeholder brackets like [Your Name] or [Podcast Name]. If you don't have specific information, write something generic like "our podcast" or "Best regards".`;

  const userPrompt = `Write a personalized outreach email to invite someone to be a guest on a podcast.

GUEST INFORMATION:
- Name: ${guestName}
- Bio/Background: ${guestBio || "Expert in their field"}

PODCAST CONTEXT:
${context || "A podcast covering industry insights and expert perspectives"}

${podcastName ? `Podcast Name: ${podcastName}` : ""}
${hostName ? `Host Name: ${hostName}` : ""}

Generate a compelling subject line and email body that:
1. Shows you've done research on the guest (reference their specific work/expertise from their bio)
2. Explains why they'd be valuable to the audience
3. Mentions what topics you'd like to discuss (based on context)
4. Includes a clear call-to-action
5. Is warm and professional

Return as JSON with "subject" and "body" fields.`;

  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: "A compelling, personalized email subject line (under 60 characters)"
            },
            body: {
              type: Type.STRING,
              description: "The email body - professional, warm, and personalized (under 200 words)"
            }
          },
          required: ["subject", "body"]
        }
      }
    })
  );

  const text = response.text;
  if (!text) throw new Error("No response from Gemini for outreach email.");

  return JSON.parse(text);
}
