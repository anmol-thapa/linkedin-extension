// api.js — shared helpers for OpenAI and Hunter.io calls
// Imported by popup.js via <script type="module"> or classic script.

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function openAIChat(apiKey, messages, model = 'gpt-5.4-mini') {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'OpenAI API error');
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Networking score ─────────────────────────────────────────────────────────

export async function getNetworkingScore(apiKey, resume, profile) {
  const profileSummary = formatProfileForPrompt(profile);

  const systemPrompt = `You are a networking assistant that helps evaluate how valuable a LinkedIn connection would be.
You will be given the user's resume/background and a LinkedIn profile.
Return ONLY valid JSON (no markdown, no commentary) in this exact shape:
{
  "score": <0-100 integer>,
  "industry_match": "<High|Medium|Low>",
  "overlap_tags": ["<tag1>", "<tag2>", ...],
  "reasoning": "<2-3 sentence plain English explanation>"
}

Scoring weights:
- Industry/company-type alignment (40%): Do they work in the same space? (big tech, startup, fintech, etc.)
- Resume overlap (30%): Shared skills, companies, schools, or role type
- Relatability (30%): Things that the profiles could relate with (current area, hometown, education, interests, programs, etc.)

Be honest. A low score is useful too — it tells the user not to waste time.`;

  const userPrompt = `MY RESUME / BACKGROUND:
${resume}

LINKEDIN PROFILE:
${profileSummary}

Mutual connections: ${profile.mutualConnections ?? 0}`;

  const raw = await openAIChat(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON if model added surrounding text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse score response from OpenAI');
  }
}

// ─── Message draft ────────────────────────────────────────────────────────────

export async function draftMessage(apiKey, resume, profile, scoreResult) {
  const profileSummary = formatProfileForPrompt(profile);

  const systemPrompt = `You are a networking coach helping write a LinkedIn connection request or opening message.
Write a SHORT, genuine, personalized message (3-4 sentences max).
- NO generic openers like "I came across your profile"
- Reference something specific from their background that resonates with the user
- Mention a genuine shared thread (company type, skill, school, industry)
- End with a low-friction ask (grab a coffee, quick chat, etc.) OR just a genuine connection request with no ask
- Sound like a real person, not a sales pitch
Return ONLY the message text. No subject line, no signature.`;

  const userPrompt = `MY BACKGROUND:
${resume}

THEIR PROFILE:
${profileSummary}

OVERLAP IDENTIFIED:
${scoreResult?.overlap_tags?.join(', ') ?? 'N/A'}

REASONING:
${scoreResult?.reasoning ?? 'N/A'}`;

  return openAIChat(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

// ─── Hunter.io email lookup ───────────────────────────────────────────────────

export async function findEmail(hunterKey, firstName, lastName, company) {
  if (!hunterKey || !company) return null;

  // Try to extract a domain from company name (rough heuristic — Hunter also accepts company names)
  const params = new URLSearchParams({
    first_name: firstName,
    last_name: lastName,
    company,
    api_key: hunterKey,
  });

  const res = await fetch(`https://api.hunter.io/v2/email-finder?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  const email = data?.data?.email;
  const confidence = data?.data?.confidence;

  if (!email) return null;
  return { email, confidence };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatProfileForPrompt(profile) {
  const lines = [];

  if (profile.name) lines.push(`Name: ${profile.name}`);
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.about) lines.push(`About: ${profile.about}`);

  if (profile.experience?.length) {
    lines.push('\nExperience:');
    profile.experience.slice(0, 5).forEach(e => {
      lines.push(`  - ${e.title} at ${e.company}${e.duration ? ` (${e.duration})` : ''}`);
    });
  }

  if (profile.education?.length) {
    lines.push('\nEducation:');
    profile.education.forEach(e => {
      lines.push(`  - ${e.school}${e.degree ? `: ${e.degree}` : ''}`);
    });
  }

  if (profile.skills?.length) {
    lines.push(`\nSkills: ${profile.skills.slice(0, 15).join(', ')}`);
  }

  return lines.join('\n');
}
