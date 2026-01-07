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
    textPrompt += ` IMPORTANT: Pay special attention to the following industry keywords and highlight them in the analysis if relevant: ${s.customKeywords.join(
      ", "
    )}.`;
  }

  const parts: any[] = [{ text: textPrompt }];

  if (typeof payload.contentInput === "string") {
    parts.push({ text: `TRANSCRIPT:\n${payload.contentInput.substring(0, 45000)}` });
  } else {
    parts.push({ inlineData: payload.contentInput.inlineData });
  }

  const response: GenerateContentResponse = await retryWithBackoff(() =>
    ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
        type: Type.OBJECT,
        properties: {
          keyTakeaways: {
            type: Type.ARRAY,
            description: "5 bullet points of the most important insights",
            items: { type: Type.STRING },
          },
          quotes: {
            type: Type.ARRAY,
            description: "5 direct quotes with approximate timestamps and speaker attribution",
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                timestamp: { type: Type.STRING, description: "Format [HH:MM:SS]" },
                speaker: { type: Type.STRING, description: "Who said this?" },
              },
            },
          },
          socialClips: {
            type: Type.ARRAY,
            description: "3 short generic clips (legacy support)",
            items: { type: Type.STRING },
          },
          socialContent: {
            type: Type.OBJECT,
            description: "Content optimized for 7 specific social platforms",
            properties: {
              linkedinPost: {
                type: Type.STRING,
                description:
                  "Professional LinkedIn post (150-300 words) with hashtags and engagement question.",
              },
              twitterThread: {
                type: Type.ARRAY,
                description: "A thread of 5-10 tweets, numbered.",
                items: { type: Type.STRING },
              },
              tiktokScript: {
                type: Type.STRING,
                description: "A 30-second script for a Reel/TikTok video with visual cues and hooks.",
              },
              youtubeDescription: {
                type: Type.STRING,
                description: "SEO-optimized YouTube Shorts description (100-150 chars).",
              },
              emailNewsletter: {
                type: Type.OBJECT,
                description: "Full email newsletter draft (500-800 words).",
                properties: {
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING, description: "Newsletter body text" },
                },
                required: ["subject", "body"],
              },
              mediumArticle: {
                type: Type.STRING,
                description: "Detailed article draft formatted in Markdown (H2, H3) ~1000 words.",
              },
              newsletterTeaser: {
                type: Type.OBJECT,
                description: "Short teaser for Substack/Beehiiv.",
                properties: {
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING },
                },
                required: ["subject", "body"],
              },
            },
            required: [
              "linkedinPost",
              "twitterThread",
              "tiktokScript",
              "youtubeDescription",
              "emailNewsletter",
              "mediumArticle",
              "newsletterTeaser",
            ],
          },
          blogPost: {
            type: Type.OBJECT,
            description: "Comprehensive SEO-optimized blog post outline (aim for depth).",
            properties: {
              title: { type: Type.STRING },
              intro: { type: Type.STRING },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heading: { type: Type.STRING },
                    content: {
                      type: Type.STRING,
                      description: "Detailed paragraph content for this section.",
                    },
                  },
                },
              },
              conclusion: { type: Type.STRING },
            },
          },
          showNotes: {
            type: Type.STRING,
            description:
              "Formatted show notes with timestamps, key topics discussed, and mentioned resources.",
          },
          faq: {
            type: Type.ARRAY,
            description: "10-15 frequently asked questions based on the transcript content.",
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
            description: "Advanced SEO Metadata and analysis",
            properties: {
              metaDescription: { type: Type.STRING, description: "160 chars max" },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              titleVariations: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywordAnalysis: {
                type: Type.ARRAY,
                description: "Top 5-10 keywords with count and density",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    count: { type: Type.NUMBER },
                    density: { type: Type.STRING, description: "Percentage string e.g. '1.5%'" },
                  },
                },
              },
              readability: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER, description: "Flesch-Kincaid score (0-100)" },
                  level: { type: Type.STRING, description: "Reading level e.g. '8th Grade'" },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
              internalLinks: {
                type: Type.ARRAY,
                description: "Suggestions for internal linking anchor text",
                items: { type: Type.STRING },
              },
            },
          },
          speakers: {
            type: Type.ARRAY,
            description: "Analysis of speakers involved",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                contribution: { type: Type.STRING },
                speakingTimePercent: { type: Type.NUMBER, description: "Estimated percentage 0-100" },
                topics: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
          sentiment: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "0 to 100, where 100 is very positive" },
              label: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative", "Mixed"] },
              tone: { type: Type.STRING, description: "Overall tone description" },
              audiencePrediction: { type: Type.STRING, description: "Prediction of likely audience reaction" },
              emotionalKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              timeline: {
                type: Type.ARRAY,
                description: "Sentiment analysis broken down by 5-10 time segments",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.STRING, description: "Time range e.g. '00:00 - 05:00'" },
                    sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
                    score: { type: Type.NUMBER, description: "Sentiment score 0-100 for this segment" },
                  },
                },
              },
            },
          },
        },
        required: [
          "keyTakeaways",
          "quotes",
          "socialContent",
          "blogPost",
          "showNotes",
          "faq",
          "seo",
          "speakers",
          "sentiment",
          "socialClips",
        ],
      },
    },
  }));

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

  const systemInstruction = `You are an expert content repurposer. Given a transcript and analysis context, generate platform-optimized repurposed content. Return ONLY JSON matching the responseSchema.`;

  const parts: any[] = [{ text: `Repurpose Type: ${payload.type}` }, { text: `Context:\n${payload.context.substring(0, 45000)}` }];

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
    return JSON.parse(text);
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
