import { Transcript, UsageMetrics } from "../types";
import { getStoredUser } from "./auth";

export const downloadPDF = async (transcript: Transcript) => {
  const { result, title, date } = transcript;
  if (!result) return;

  const user = getStoredUser();
  const branding = user?.branding;

  try {
    // Dynamic import to prevent page load blocking/errors
    const { jsPDF } = await import("jspdf");
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 20;

    // Helper to add text and advance Y position
    const addText = (text: string, fontSize: number, fontStyle: string = "normal", color: [number, number, number] = [0, 0, 0]) => {
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      
      // Clean text to handle weird chars if any
      const cleanText = (text || '').replace(/[^\x20-\x7E\n]/g, ''); 
      const splitText = doc.splitTextToSize(cleanText, contentWidth);
      
      // Check page break
      if (yPos + (splitText.length * fontSize * 0.5) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      }

      doc.text(splitText, margin, yPos);
      yPos += (splitText.length * fontSize * 0.4) + 6;
    };

    const addSpacing = (amount: number = 10) => {
      yPos += amount;
    };

    const checkPageBreak = (heightNeeded: number) => {
      if (yPos + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Custom Branding Header
    if (branding?.logoUrl) {
       try {
           doc.addImage(branding.logoUrl, 'PNG', margin, yPos, 30, 30);
           yPos += 35;
       } catch (e) {
           console.warn("Failed to add logo to PDF", e);
       }
    }

    // Title Page
    addText(title, 24, "bold", [31, 41, 55]);
    addText(`Analyzed on: ${new Date(date).toLocaleDateString()}`, 10, "normal", [107, 114, 128]);
    addSpacing(10);

    // Sentiment
    if (result.sentiment) {
      addText(`Sentiment: ${result.sentiment.label} (${result.sentiment.score}/100)`, 14, "bold", [75, 85, 99]);
      if (result.sentiment.tone) {
         addText(`Tone: ${result.sentiment.tone}`, 11, "italic");
      }
      if (result.sentiment.audiencePrediction) {
        addText(`Audience Prediction: ${result.sentiment.audiencePrediction}`, 11);
      }
      addSpacing(5);
    }

    // Key Takeaways
    addText("Key Takeaways", 16, "bold", [99, 102, 241]); 
    result.keyTakeaways.forEach(item => {
      addText(`• ${item}`, 11);
    });
    addSpacing();

    // Speakers
    addText("Speaker Analytics", 16, "bold", [99, 102, 241]);
    result.speakers.forEach(speaker => {
      checkPageBreak(30);
      addText(`${speaker.name} (${speaker.role})`, 12, "bold");
      if(speaker.speakingTimePercent) addText(`Speaking Time: ${speaker.speakingTimePercent}%`, 10, "normal", [100,100,100]);
      addText(speaker.contribution, 10, "italic", [75, 85, 99]);
      yPos += 2;
    });
    addSpacing();

    // Social Content
    if (result.socialContent) {
      doc.addPage(); 
      yPos = margin;
      addText("Social Media Content", 18, "bold", [236, 72, 153]); 
      addSpacing(5);

      addText("LinkedIn Post", 14, "bold");
      addText(result.socialContent.linkedinPost, 10);
      addSpacing();

      addText("Twitter Thread", 14, "bold");
      result.socialContent.twitterThread.forEach((tweet, i) => {
        addText(`${i+1}. ${tweet}`, 10);
      });
      addSpacing();

      addText("Newsletter", 14, "bold");
      addText(`Subject: ${result.socialContent.emailNewsletter.subject}`, 11, "bold");
      addText(result.socialContent.emailNewsletter.body, 10);
    }

    // SEO
    if (result.seo) {
      doc.addPage();
      yPos = margin;
      addText("SEO Strategy", 18, "bold", [37, 99, 235]);
      addSpacing(5);
      
      addText("Target Keywords", 12, "bold");
      addText(result.seo.keywords.join(", "), 10);
      addSpacing();

      addText("Meta Description", 12, "bold");
      addText(result.seo.metaDescription, 10);
      addSpacing();
    }

    // Blog Post
    addText("Blog Draft: " + result.blogPost.title, 16, "bold", [31, 41, 55]);
    addText(result.blogPost.intro, 11);
    addSpacing(5);
    result.blogPost.sections.forEach(section => {
      checkPageBreak(50);
      addText(section.heading, 12, "bold");
      addText(section.content, 11);
      addSpacing(5);
    });
    checkPageBreak(30);
    addText("Conclusion", 12, "bold");
    addText(result.blogPost.conclusion, 11);

    // Footer Branding
    if (branding?.emailFooter) {
        yPos = doc.internal.pageSize.getHeight() - 20;
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(branding.emailFooter, margin, yPos);
    }

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`);
  } catch (error) {
    console.error("PDF Generation failed:", error);
    alert("Failed to generate PDF. Please ensure your browser supports it.");
  }
};

export const downloadMediaKit = async (transcript: Transcript) => {
  const { result, title, date } = transcript;
  if (!result || !result.sponsorship) return;

  try {
    const { jsPDF } = await import("jspdf");
    
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 20;

    const addText = (text: string, fontSize: number, fontStyle: string = "normal", color: [number, number, number] = [0, 0, 0], align: "left" | "center" | "right" = "left") => {
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      
      const cleanText = (text || '').replace(/[^\x20-\x7E\n]/g, ''); 
      const splitText = doc.splitTextToSize(cleanText, contentWidth);

      // Check page break
      if (yPos + (splitText.length * fontSize * 0.5) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      }

      doc.text(splitText, align === "left" ? margin : pageWidth / 2, yPos, { align });
      yPos += (splitText.length * fontSize * 0.4) + 6;
    };
    
    const addSpacing = (amount: number = 10) => { yPos += amount; };

    // Header
    doc.setFillColor(99, 102, 241); // Indigo Primary
    doc.rect(0, 0, pageWidth, 40, 'F');
    yPos = 25;
    addText("PODCAST SPONSOR KIT", 22, "bold", [255, 255, 255], "center");
    yPos = 60;

    // Episode Info
    addText("EPISODE DETAILS", 14, "bold", [100, 100, 100]);
    addText(title, 18, "bold");
    addText(`Released: ${new Date(date).toLocaleDateString()}`, 11, "normal", [120, 120, 120]);
    addSpacing(10);

    // Audience Profile
    addText("AUDIENCE PROFILE", 14, "bold", [99, 102, 241]);
    addText(result.sponsorship.targetAudienceProfile, 11);
    addSpacing(10);

    // Key Topics
    addText("KEY TOPICS", 14, "bold", [99, 102, 241]);
    addText(result.seo?.keywords.slice(0, 8).join(", ") || "", 11);
    addSpacing(10);

    // Stats Placeholder
    // Draw a box for stats
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'FD');
    
    const statsY = yPos + 15;
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text("ESTIMATED REACH", margin + 20, statsY);
    doc.text("ENGAGEMENT SCORE", pageWidth / 2, statsY, {align: 'center'});
    doc.text("SPONSOR FIT", pageWidth - margin - 20, statsY, {align: 'right'});
    
    doc.setFontSize(16); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
    doc.text("5,000+", margin + 20, statsY + 10);
    doc.text("High", pageWidth / 2, statsY + 10, {align: 'center'});
    doc.text(`${result.sponsorship.score}/100`, pageWidth - margin - 20, statsY + 10, {align: 'right'});

    yPos += 55;

    // Ad Spots
    addText("OPPORTUNITIES", 14, "bold", [99, 102, 241]);
    result.sponsorship.potentialAdSpots.forEach(spot => {
        addText(`• ${spot}`, 11);
    });

    // Contact
    yPos = doc.internal.pageSize.getHeight() - 40;
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;
    addText("Contact: partnerships@podcastinsight.com", 12, "bold", [50, 50, 50], "center");

    doc.save("Sponsor_Media_Kit.pdf");

  } catch (error) {
    console.error("Media Kit Generation failed:", error);
    alert("Failed to generate Media Kit.");
  }
};

export const downloadAnalyticsReport = async (stats: UsageMetrics) => {
    try {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPos = 20;

        // Header
        doc.setFillColor(31, 41, 55); // Dark Gray
        doc.rect(0, 0, pageWidth, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Account Performance Report", margin, 30);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text(`Period: ${stats.period}`, margin, 40);

        yPos = 70;

        // Summary Grid
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Executive Summary", margin, yPos);
        yPos += 10;

        // Draw boxes
        const boxWidth = (pageWidth - (margin * 3)) / 2;
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(249, 250, 251);

        // Box 1: Usage
        doc.roundedRect(margin, yPos, boxWidth, 30, 3, 3, 'FD');
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text("TRANSCRIPTS PROCESSED", margin + 5, yPos + 10);
        doc.setFontSize(16); doc.setTextColor(0, 0, 0);
        doc.text(`${stats.transcriptsUsed} / ${stats.transcriptQuota}`, margin + 5, yPos + 22);

        // Box 2: ROI
        doc.roundedRect(margin + boxWidth + margin, yPos, boxWidth, 30, 3, 3, 'FD');
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text("HOURS SAVED", margin + boxWidth + margin + 5, yPos + 10);
        doc.setFontSize(16); doc.setTextColor(0, 0, 0);
        doc.text(`${stats.hoursSaved} hrs`, margin + boxWidth + margin + 5, yPos + 22);

        yPos += 45;

        // Content Breakdown
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Content Generation Stats", margin, yPos);
        yPos += 10;

        stats.contentGenerated.forEach(c => {
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`${c.type}:`, margin, yPos);
            doc.setFont("helvetica", "bold");
            doc.text(`${c.count} items`, margin + 60, yPos);
            yPos += 10;
        });

        yPos += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 15;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Generated by Podcast Insight Dashboard", margin, yPos);

        doc.save(`Analytics_Report_${stats.period.replace(' ', '_')}.pdf`);

    } catch (error) {
        console.error("Report Generation failed:", error);
        alert("Failed to generate analytics report.");
    }
};

export const downloadDOCX = async (transcript: Transcript) => {
  const { result, title, date } = transcript;
  if (!result) return;

  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
    const { saveAs } = await import("file-saver");

    const createHeading = (text: string, level: number = HeadingLevel.HEADING_2) => {
      return new Paragraph({
        text: text,
        heading: typeof level === 'number' ? level : HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      });
    };

    const createText = (text: string, bold: boolean = false, italic: boolean = false) => {
      return new Paragraph({
        children: [new TextRun({ text, bold, italics: italic })],
        spacing: { after: 100 },
      });
    };

    const sections = [];

    // Title
    sections.push(new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
    }));

    sections.push(new Paragraph({
      text: `Analyzed on: ${new Date(date).toLocaleDateString()}`,
      spacing: { after: 300 },
    }));

    // Sentiment
    if (result.sentiment) {
        sections.push(createHeading("Sentiment Analysis"));
        sections.push(createText(`Score: ${result.sentiment.score}/100 (${result.sentiment.label})`, true));
        if (result.sentiment.tone) sections.push(createText(`Tone: ${result.sentiment.tone}`));
        if (result.sentiment.audiencePrediction) sections.push(createText(`Audience Prediction: ${result.sentiment.audiencePrediction}`));
    }

    // Takeaways
    sections.push(createHeading("Key Takeaways"));
    result.keyTakeaways.forEach(item => {
      sections.push(new Paragraph({
        text: item,
        bullet: { level: 0 },
      }));
    });

    // Speakers
    sections.push(createHeading("Speaker Analytics"));
    result.speakers.forEach(speaker => {
      sections.push(createText(`${speaker.name} (${speaker.role})`, true));
      if (speaker.speakingTimePercent) sections.push(createText(`Speaking Time: ${speaker.speakingTimePercent}%`));
      sections.push(createText(speaker.contribution, false, true));
    });

    // Social Content
    if (result.socialContent) {
      sections.push(createHeading("Social Media Content", HeadingLevel.HEADING_1));
      
      sections.push(createHeading("LinkedIn Post", HeadingLevel.HEADING_3));
      sections.push(createText(result.socialContent.linkedinPost));

      sections.push(createHeading("Twitter Thread", HeadingLevel.HEADING_3));
      result.socialContent.twitterThread.forEach((t, i) => {
         sections.push(createText(`${i+1}. ${t}`));
      });

      sections.push(createHeading("TikTok Script", HeadingLevel.HEADING_3));
      sections.push(createText(result.socialContent.tiktokScript));

      sections.push(createHeading("Email Newsletter", HeadingLevel.HEADING_3));
      sections.push(createText(`Subject: ${result.socialContent.emailNewsletter.subject}`, true));
      sections.push(createText(result.socialContent.emailNewsletter.body));
    }

    // SEO
    if (result.seo) {
      sections.push(createHeading("SEO Strategy", HeadingLevel.HEADING_1));
      sections.push(createText("Keywords: " + result.seo.keywords.join(", ")));
      sections.push(createText("Meta Description: " + result.seo.metaDescription));
    }

    // Blog Post
    sections.push(createHeading("Blog Draft", HeadingLevel.HEADING_1));
    sections.push(createHeading(result.blogPost.title));
    sections.push(createText(result.blogPost.intro));
    
    result.blogPost.sections.forEach(section => {
      sections.push(createHeading(section.heading, HeadingLevel.HEADING_3));
      sections.push(createText(section.content));
    });

    sections.push(createHeading("Conclusion", HeadingLevel.HEADING_3));
    sections.push(createText(result.blogPost.conclusion));

    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_insights.docx`);
    });
  } catch (error) {
    console.error("DOCX Generation failed:", error);
    alert("Failed to generate DOCX.");
  }
};

export const generateMarkdownString = (transcript: Transcript): string => {
    const { result, title, date } = transcript;
    if (!result) return '';

    let md = `# ${title}\n`;
    md += `Analyzed on: ${new Date(date).toLocaleDateString()}\n\n`;

    // Sentiment
    if (result.sentiment) {
        md += `## Sentiment\n**Score:** ${result.sentiment.score}/100 (${result.sentiment.label})\n\n`;
        if (result.sentiment.tone) md += `**Tone:** ${result.sentiment.tone}\n\n`;
        if (result.sentiment.audiencePrediction) md += `**Prediction:** ${result.sentiment.audiencePrediction}\n\n`;
    }

    // Takeaways
    md += `## Key Takeaways\n`;
    result.keyTakeaways.forEach(item => {
        md += `- ${item}\n`;
    });
    md += `\n`;

    // Blog Post
    md += `## Blog Post: ${result.blogPost.title}\n\n`;
    md += `**Meta Description:** ${result.seo?.metaDescription || ''}\n\n`;
    md += `${result.blogPost.intro}\n\n`;
    result.blogPost.sections.forEach(s => {
      md += `### ${s.heading}\n\n${s.content}\n\n`;
    });
    md += `### Conclusion\n\n${result.blogPost.conclusion}\n\n`;

    // Show Notes
    if (result.showNotes) {
      md += `---\n\n## Show Notes\n\n${result.showNotes}\n\n`;
    }

    // FAQ
    if (result.faq && result.faq.length > 0) {
      md += `---\n\n## FAQ\n\n`;
      result.faq.forEach(q => {
        md += `**Q: ${q.question}**\n\n${q.answer}\n\n`;
      });
    }
    
    return md;
};

export const downloadMarkdown = async (transcript: Transcript) => {
  try {
    const { saveAs } = await import("file-saver");
    const md = generateMarkdownString(transcript);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    saveAs(blob, `${transcript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`);
  } catch (error) {
    console.error("Markdown Generation failed:", error);
    alert("Failed to download Markdown.");
  }
};

export const downloadJSON = async (transcript: Transcript) => {
    try {
        const { saveAs } = await import("file-saver");
        const blob = new Blob([JSON.stringify(transcript, null, 2)], { type: "application/json;charset=utf-8" });
        saveAs(blob, `${transcript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
    } catch (error) {
        console.error("JSON Export failed:", error);
        alert("Failed to export JSON.");
    }
};

export const sendEmailExport = async (transcript: Transcript, email: string): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`Emailing results for ${transcript.title} to ${email}`);
    // In a real app, this would call a backend endpoint
};

export const exportToGoogleSheets = async (transcript: Transcript): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Exporting ${transcript.title} to Google Sheets`);
    // In a real app, this would use the Google Sheets API
};

export const bulkExportZIP = async (transcripts: Transcript[]) => {
    try {
        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");
        
        const zip = new JSZip();
        
        transcripts.forEach(transcript => {
            const folderName = transcript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const folder = zip.folder(folderName);
            if (folder) {
                // Add JSON
                folder.file("data.json", JSON.stringify(transcript, null, 2));
                // Add Markdown Summary
                folder.file("summary.md", generateMarkdownString(transcript));
                // Add Text Content
                folder.file("transcript.txt", transcript.content);
            }
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `podcast_insights_bulk_export_${new Date().toISOString().split('T')[0]}.zip`);
    } catch (error) {
        console.error("Bulk Export failed:", error);
        alert("Failed to create ZIP export.");
    }
};