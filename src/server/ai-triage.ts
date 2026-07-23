type TriageResult = {
  summary: string;
  priority: "P0" | "P1" | "P2";
  suggestedLabel: string;
};

export async function triageEvent(
  eventType: string,
  payload: Record<string, any>
): Promise<TriageResult> {
  const textContent = extractTextContent(eventType, payload);
  if (!textContent.title && !textContent.body) {
    return {
      summary: `${eventType.toUpperCase()} event received with no detailed body text.`,
      priority: "P2",
      suggestedLabel: "triage"
    };
  }

  // 1. Try Groq API if key exists
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const result = await callGroqAPI(groqKey, textContent);
      if (result) return result;
    } catch (e) {
      console.warn("Groq AI triage failed, falling back to heuristics:", e);
    }
  }

  // 2. Try Gemini API if key exists
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const result = await callGeminiAPI(geminiKey, textContent);
      if (result) return result;
    } catch (e) {
      console.warn("Gemini AI triage failed, falling back to heuristics:", e);
    }
  }

  // 3. Fallback to Smart Rule Heuristics
  return heuristicTriage(eventType, textContent);
}

function extractTextContent(eventType: string, payload: Record<string, any>) {
  if (eventType === "issues") {
    return {
      title: payload.issue?.title || "",
      body: payload.issue?.body || "",
      action: payload.action || ""
    };
  }
  if (eventType === "pull_request") {
    return {
      title: payload.pull_request?.title || "",
      body: payload.pull_request?.body || "",
      action: payload.action || ""
    };
  }
  if (eventType === "push") {
    const commits = payload.commits || [];
    const lastMsg = commits.length > 0 ? commits[commits.length - 1].message : "";
    return {
      title: `Push to ${payload.ref || "repo"} (${commits.length} commits)`,
      body: lastMsg,
      action: "push"
    };
  }
  return { title: "", body: "", action: "" };
}

async function callGroqAPI(apiKey: string, textContent: { title: string; body: string }): Promise<TriageResult | null> {
  const prompt = `Analyze this GitHub item and return JSON ONLY with keys "summary" (1 short sentence), "priority" ("P0" for critical/crash/security, "P1" for feature/medium, "P2" for low/docs/typo), and "suggestedLabel" (e.g. bug, enhancement, security, documentation, chore).
Title: ${textContent.title}
Body: ${textContent.body}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content);
  return {
    summary: parsed.summary || textContent.title,
    priority: normalizePriority(parsed.priority),
    suggestedLabel: parsed.suggestedLabel || "triage"
  };
}

async function callGeminiAPI(apiKey: string, textContent: { title: string; body: string }): Promise<TriageResult | null> {
  const prompt = `Analyze this GitHub item and return JSON ONLY with keys "summary" (1 short sentence), "priority" ("P0" for critical/crash/security, "P1" for feature/medium, "P2" for low/docs/typo), and "suggestedLabel" (e.g. bug, enhancement, security, documentation, chore).
Title: ${textContent.title}
Body: ${textContent.body}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const parsed = JSON.parse(text);
  return {
    summary: parsed.summary || textContent.title,
    priority: normalizePriority(parsed.priority),
    suggestedLabel: parsed.suggestedLabel || "triage"
  };
}

function heuristicTriage(eventType: string, textContent: { title: string; body: string }): TriageResult {
  const combined = `${textContent.title} ${textContent.body}`.toLowerCase();
  
  if (/\b(crash|security|fatal|vulnerability|down|urgent|exploit|breach)\b/.test(combined)) {
    return {
      summary: `High priority critical item detected: ${textContent.title || "Critical event"}`,
      priority: "P0",
      suggestedLabel: combined.includes("security") ? "security" : "bug"
    };
  }

  if (/\b(bug|error|fail|broken|fix|exception|issue|problem|invalid)\b/.test(combined)) {
    return {
      summary: `Bug report or fix identified: ${textContent.title || "Bug issue"}`,
      priority: "P1",
      suggestedLabel: "bug"
    };
  }

  if (/\b(feat|feature|add|implement|request|enhancement|support|allow)\b/.test(combined)) {
    return {
      summary: `New feature request or enhancement: ${textContent.title || "Feature request"}`,
      priority: "P1",
      suggestedLabel: "enhancement"
    };
  }

  if (/\b(doc|readme|typo|comment|clean|style|test|chore|refactor)\b/.test(combined)) {
    return {
      summary: `Maintenance or documentation update: ${textContent.title || "Chore task"}`,
      priority: "P2",
      suggestedLabel: combined.includes("doc") || combined.includes("readme") ? "documentation" : "chore"
    };
  }

  return {
    summary: textContent.title ? `Event received: ${textContent.title}` : `Standard ${eventType} activity captured.`,
    priority: "P2",
    suggestedLabel: "triage"
  };
}

function normalizePriority(pri: any): "P0" | "P1" | "P2" {
  if (pri === "P0" || pri === "P1" || pri === "P2") return pri;
  if (typeof pri === "string" && pri.includes("0")) return "P0";
  if (typeof pri === "string" && pri.includes("1")) return "P1";
  return "P2";
}
