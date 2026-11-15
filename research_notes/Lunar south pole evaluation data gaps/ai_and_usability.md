# AI-feature testing without a key, and lightweight usability evidence (hackathon, 2026)

## (a1) Anthropic API access, free credits, current model ids and cost

### Takeaway
Haiku 5.5 (`claude-haiku-5-5`) costs $0.10/MTok input and $0.50/MTok output for prompts up to 100k tokens, so a ~200-in/~300-out call is about $0.00017, or roughly 17 cents per 1,000 uses (before any thinking tokens). I found no official Anthropic free API tier, student programme or hackathon credit scheme. Any such claim comes from third-party aggregators and is unverified.

### Cited Findings
- Model id `claude-haiku-5-5` (alias same as id; "fastest" latency; 1M context; 128K max output; default effort `medium`; adaptive thinking; retirement not sooner than Oct 7, 2027). Siblings: `claude-sonnet-5-5` ($2/$10 per MTok), `claude-opus-5-5` ($4/$20), `claude-fable-5-2` ($8/$40). — [Models overview](https://platform.claude.com/docs/en/models/overview)
- Haiku 5.5 pricing: prompts up to 100,000 tokens $0.10/MTok input, $0.50/MTok output (5m cache write $0.125, cache read $0.01); prompts over 100k tokens $0.50 in / $2.50 out. Batch API is 50% off ($0.05 in / $0.25 out). Older Haiku 4.5 is $1/$5. — [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Computed estimate (my arithmetic from the above): 200 input tokens x $0.10/1M = $0.00002; 300 output tokens x $0.50/1M = $0.00015; total about $0.00017 per click, about $0.17 per 1,000 clicks, about $1.70 per 10,000. Batch API is not suitable (async), and caching a ~200-token prompt is not worthwhile.
- The pricing page notes Haiku 5.5 lists no free tier or free credits; the docs pricing page itself shows none (page text mentions only paid pricing, batch, caching, long-context). — [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Anthropic's support article "How do I claim my free credits" exists (id 8994925) but the fetch returned 404 at support.claude.com, so amounts/terms could not be confirmed. A search snippet said only that free credits are subject to Anthropic's Credit Terms. — [search listing](https://support.anthropic.com/en/articles/8994925-how-do-i-claim-my-free-credits)
- Claude Startups programme: Startup Stack offers "worth up to $45,000" redeemable in Claude Console; up to $100K extra API credits for VC-backed founders via partner VCs; the current cohort is full and not accepting applications; credits apply only to first-party Claude API; page mentions hackathons for members only and describes no student/hackathon credit programme. — [Claude Startups](https://claude.com/programs/startups)
- Third-party sites claim about $5 trial credit for new accounts after phone verification and student/hackathon credits. These are aggregators/resellers; claims conflict (e.g. $50 vs $500+) and are unverified. — [search results summary](https://aireiter.com/blog/claude-api-free-credits-every-way), [getaiperks](https://www.getaiperks.com/en/ai/claude-credits-for-students)
- Google Gemini API has a rate-limited free tier, but reported limits conflict across secondary sources (e.g. 5 RPM / 100 RPD after March 2026 vs 5-15 RPM and 100-1,000 RPD); check AI Studio for real numbers. — [Gemini rate-limit forum thread](https://discuss.ai.google.dev/t/gemini-api-rate-limits-free-tier/125968), [agentdeals](https://agentdeals.dev/gemini-api-pricing-changes)

### Inferences
- Even a minimal prepaid top-up (the console's smallest purchase, amount not verified) would cover tens of thousands of clicks for this feature; the real risk is abuse of a public endpoint, not routine cost.
- Haiku 5.5 defaults to adaptive thinking at medium effort. Thinking tokens bill as output, so for a short explanation set a low effort / disable thinking where allowed (the Models API `capabilities.thinking.types.disabled.supported` flag tells you per model; I did not check it for Haiku 5.5). Otherwise real cost per call may be several times the estimate.
- Recommend telling judges "optional feature; app fully works without it" and not relying on promised credits.

### Gaps
- Could not open the official free-credits support article, Anthropic Console billing page, or any Anthropic student/hackathon credits page; no verified Anthropic hackathon sponsorship for NASA Space Apps found. Smallest Console top-up amount not confirmed. Ask the event's organisers/mentors whether partner API credits exist.

## (a2) Testing the AI feature end to end without any key

### Takeaway
Treat the model as a replaceable dependency: mock `POST /ai/explain`, replay recorded fixtures, contract-test the request/response shape, and unit-test the number guard with adversarial strings. Nothing here requires a key. (This section is engineering recommendation, not sourced research.)

### Cited Findings
- No external source needed; the recommendations below follow from the app description supplied in the task (server route `POST /ai/explain`, client rejects any reply containing a number not in the verdict).

### Inferences
Minimal test plan:
1. Number-guard unit tests (pure function `extractNumbers(reply)` subset-of `allowedNumbers(verdict)`): pass cases (all numbers in verdict; spelled-out "two" policy decided explicitly); fail cases (invented 37%, "3 days", dates, ranges "10-12", thousands separators "1,200", decimals "5.0" vs "5", unicode minus, percent signs, numbers inside units like "H2O" or site names like "Site 3"); empty reply; reply with no digits. Define a normalisation (strip commas, trim trailing zeros) and test it.
2. Contract tests with fixtures: JSON files for request `{verdict, site, ...}` and response `{text}`/error shapes; validate against a schema (zod/ajv); assert status handling for 200, 400 (bad body), 429 (rate limit), 500/timeout, and missing key (server returns 503 "AI disabled", UI hides or greys the button).
3. Local mock server (e.g. 20 lines of Express/`msw`/Vitest mock) with switchable modes: good reply, reply with an invented number (must be rejected, UI falls back to the deterministic template), slow reply (spinner, timeout, abort), malformed JSON, 429. Run Playwright/Cypress against it for the click, loading, fallback and error states.
4. Recorded fixtures: hand-write 5-10 plausible replies, including 2-3 deliberately bad ones, and replay them; label them clearly in the repo as "fixtures, not live model output" to stay honest with judges.
5. Feature-flag test: with no `ANTHROPIC_API_KEY`, the whole app, including the brief without AI, passes the same E2E suite; "Write with AI" is hidden/disabled with an explanatory tooltip.
6. Optional live smoke test (one script, run once by anyone who has a key; gated by env var, skipped in CI) that asserts reply passes the guard on 3 real verdicts.

### Gaps
- None for the plan itself; real model behaviour (how often it invents numbers) cannot be measured without a key or a local model.

## (a3) Free alternatives if no key (open-weight / hosted free tiers)

### Takeaway
Ollama (local) and WebLLM (in-browser via WebGPU) can run small open-weight models for free and are good enough for a demo of a 3-4 sentence explanation, with the number guard as the safety net. Quality, speed and setup burden are the trade-offs; exact model names/sizes were not verified here.

### Cited Findings
- Ollama runs open models locally from CLI, REST API (`http://localhost:11434/api/chat`) and Python/JS libraries; lists llama.cpp as a backend; full model list is at ollama.com/library (README example uses `ollama run gemma4`). — [Ollama README](https://github.com/ollama/ollama/blob/main/README.md)
- WebLLM is an in-browser LLM inference engine using WebGPU hardware acceleration, runs models locally (no server processing, privacy benefit), offers an OpenAI-style API, web-worker support, and supports Llama, Phi, Gemma, Mistral and others. — [WebLLM docs](https://webllm.mlc.ai/docs/)
- Google Gemini API has a free tier with strict, changing limits (see a1). — [Gemini rate limits thread](https://discuss.ai.google.dev/t/gemini-api-rate-limits-free-tier/125968)

### Inferences
- Ollama: easy for a team laptop demo, but a public Vercel deployment cannot reach your localhost; use it for dev/test and for a recorded demo video. Use an OpenAI/Anthropic-shaped adapter so `/ai/explain` can switch provider by env var.
- WebLLM: runs on the visitor's device, so no key, no server cost, and no abuse risk; costs are a large first-load model download (hundreds of MB to GB), WebGPU requirement (not on all browsers/phones), and slower, lower-quality text. Good as "optional, on-device" mode.
- Free hosted tiers (Gemini, etc.) are rate-limited and policy can change without notice; fine for a weekend demo but cap per-IP use and keep the deterministic fallback.
- Small models are more likely to add unsupported numbers; the number guard will reject more replies, so show the template fallback gracefully.

### Gaps
- Did not verify specific small-model names, parameter sizes, RAM needs, latency, or Hugging Face/other hosted-inference free-tier terms; Ollama README did not give sizes or OpenAI-compatibility details in the fetched text.

## (a4) Safe handling of the key on Vercel/Node and abuse limits

### Takeaway
Keep the key in a server-only environment variable used by the serverless route; never expose it to the client bundle; add per-IP/day rate limiting, input validation, a hard `max_tokens`, and an account-level spend limit.

### Cited Findings
- Vercel environment variables are set per environment (Production/Preview/Development), are encrypted at rest, can be read by Functions at runtime, and changes only apply to new deployments (redeploy required). Variables can be typed Secret (write-only after saving) vs Config (readable by authorised team members). — [Vercel env vars](https://vercel.com/docs/environment-variables)
- In Next.js, `NEXT_PUBLIC_` variables are inlined into the client bundle at build time, so a key must never carry that prefix. — [Vercel env vars troubleshooting](https://vercel.com/docs/environment-variables)

### Inferences
(Engineering practice, not fetched sources.)
- Store `ANTHROPIC_API_KEY` as a Secret type var; read only in `/api/ai/explain`; never log it or send it to the browser; keep it out of git (`.env.local` in `.gitignore`).
- Server builds the prompt from the verdict itself (client sends only structured verdict fields, not free text), validates input size, sets small `max_tokens` (e.g. 400) and a timeout.
- Rate limit by IP: e.g. 5/min and 20/day per IP plus a global daily cap, using a shared store (Vercel KV/Upstash Redis or similar); in-memory counters do not persist across serverless instances. Return 429 and fall back to the template brief.
- Set a monthly spend limit / small prepaid balance in the Anthropic Console so worst-case abuse is bounded (limit feature names not verified here); rotate the key after the event; use a separate key for the demo.
- Optionally add a "demo mode" that serves fixture replies when the budget cap or key is absent.

### Gaps
- Did not verify Anthropic Console spend-limit settings or Vercel rate-limit/WAF product details.

## (b1) Lightweight usability methods and a copy-paste protocol

### Takeaway
Combine a heuristic evaluation (Nielsen's 10), a cognitive walkthrough, an automated WCAG check, and a small task-based test of 3-5 people with SUS; report them as "lightweight, formative, small-sample" evidence, not statistical proof.

### Cited Findings
- Nielsen's 10 heuristics: visibility of system status; match between system and real world; user control and freedom; consistency and standards; error prevention; recognition rather than recall; flexibility and efficiency of use; aesthetic and minimalist design; help users recognize, diagnose, and recover from errors; help and documentation. — [NN/g 10 heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- 5 users: a single study with 5 participants finds about 85% of problems under the model N(1-(1-L)^n) with L = 31% (1-0.69^5 = 85%); caveats: users must be comparable; with several distinct user groups test 3-4 per group (3 each for 3+ groups); at least 3 users; better as several small rounds with redesign between than one large study; the article is from 2000 and based on 1993 research. — [NN/g, Why you only need to test with 5 users](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)
- SUS: 10 items, 5 response options. Scoring: odd items = response - 1; even items = 5 - response; sum x 2.5 gives 0-100. Average across ~500 studies is 68 (a C); about 80.3+ is an A (top 10%); below 51 is an F; a SUS score is not a percentage; reliability does not depend on sample size but small samples give imprecise estimates, so report a confidence interval. — [MeasuringU SUS](https://measuringu.com/sus/)
- W3C WAI "Easy Checks": image alt text, page title, headings, colour contrast, skip link, visible keyboard focus, page language, zoom, form labels; a page can pass these and still have significant barriers, so they are not a full audit. — [W3C WAI easy checks](https://www.w3.org/WAI/test-evaluate/easy-checks/)

### Inferences
(The protocol and wording below are my own drafts; the SUS items are Brooke's standard wording from memory, not re-fetched from a source this session. The Brooke 1996 original and usability.gov SUS page were not opened: usability.gov redirects to digital.gov.)

**One-page protocol (15-20 min per person; 3-5 people, mix of one planner/engineer-type, one educator, one general public; ask for consent, say "we test the tool, not you", record only notes)**
- Intro (1 min): "This tool compares candidate lunar south pole sites. Please think aloud. I won't help unless you're stuck for more than 60 s."
- 5-second test (optional): show the landing/results screen for 5 s, hide, ask "What is this for? What was the main result?" Success: names purpose (site/start-date comparison) and one result.
- Tasks (one at a time; record success Y/partial/N, time, errors, quotes):
  1. Find which preset site has the most Sun and Earth visibility together. Success: names correct site (answer key from your data) in under 90 s without help.
  2. Find the best start date for the Shackleton ridge site. Success: states the date the tool recommends and can say why.
  3. Change the assumptions so a relay is assumed and say what changes in the verdict. Success: finds the toggle and describes the change (e.g. verdict/coverage shifts) correctly.
  4. Read the verdict for one site and explain in your own words whether it is "go" or "not yet" and what the main limit is. Success: paraphrase matches the verdict.
  5. Find where the data sources and limitations are stated. Success: locates them within 60 s.
  6. (Optional) Use "Write with AI" (or the fixture-mode button) to generate a brief and say if any number looks unsupported. Success: finds the button, understands that numbers come from the verdict, can identify the fallback if AI is off.
- Targets (suggested, state as team goals): at least 80% of task attempts succeeded unaided; median task time under 90 s; no task failed by 2+ people without a fix.
- Wrap-up: SUS (below), then "What was most confusing? What would you change?"
- Record: severity (0-4) of each issue, e.g. 4 = blocks the task; fix the top 3, then re-test 2 people to show iteration (matches NN/g advice for small iterative rounds).

**SUS items (1 = strongly disagree ... 5 = strongly agree)**
1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.
Scoring: odd items (r-1), even items (5-r), sum, x2.5; average across participants; with n of 5 report the range, say it is indicative only, compare to the 68 benchmark.

**Other low-cost methods**: heuristic evaluation by 2-3 team members independently, then merged (log violations with heuristic number, severity, screenshot); cognitive walkthrough per task asking "Will the user know what to do? See the control? Connect it to the goal? See progress?"; think-aloud with 3 people; for visualisation/dashboard checks, a team checklist (labelled axes and units, colour-blind-safe colours, uncertainty/limits shown, no truncation or misleading scales, data source and date on screen) — this checklist is my suggestion; I did not find a single authoritative source for scientific-dashboard heuristics.

### Gaps
- Did not open Brooke 1996 original, Sauro/Lewis papers, usability.gov cognitive-walkthrough pages, or an authoritative data-visualisation heuristics source; SUS item wording is unverified against a fetched source. Task answer keys depend on the app's data.

## (b2) What Space Apps judges value; presenting validation honestly

### Takeaway
Space Apps judges use five criteria: Impact, Creativity, Validity, Relevance, Presentation (wording below is from the 2022 guide; 2025 guide not directly readable). Validity and Relevance explicitly reward scientific soundness and usability, so the lightweight usability and verification evidence maps directly onto them.

### Cited Findings
- 2022 Judging and Awards Guide criteria: Impact (quality and quantity, big or small problem, helps many or few); Creativity (novel vs incremental); Validity ("Is the solution scientifically valid? Will it do what it sets out to do? Can it work in the real world?"); Relevance (responsive to the challenge, complete or long way to go, technically feasible, "how usable or user friendly is the solution?"); Presentation (how well the team communicated the challenge, solution, and why it matters). The guide says local, global and executive judges use these. — [Space Apps 2022 Judging and Awards Guide (PDF)](https://spaceapps-prod.s3.amazonaws.com/media/documents/Space_Apps_2022_Judging_and_Awards_Guide.pdf)
- A search result summary states that the current (2025) Project Submission Guide still lists the same five criteria and refers to the 2025 Judging and Awards Guide; official guidance stresses that Presentation deserves equal attention. Not confirmed by direct reading (site certificate error on fetch). — [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/), [Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide)
- A 2017 NASA blog said criteria were equally important (may not hold now). — [2017 blog](https://2017.spaceappschallenge.org/blog/how-develop-winning-space-apps-solution)

### Inferences
- I could not retrieve the Space Apps 2026 criteria; assume unchanged but check the current guide.
- Honest presentation: one slide "How we checked it" with (1) what was verified (automated tests, number-guard tests, data cross-checks), (2) usability: n participants, tasks, success rate, SUS with range, top issues fixed, (3) accessibility scores, (4) explicit limitations (small non-representative sample; no formal study; AI feature optional and tested with mocks/fixtures if no live key; model results are not mission-grade). Label evidence as formative, not statistical.

### Gaps
- Space Apps 2026 judging text, scoring weights, and any 2026 Moon-related challenge wording not confirmed.

## (b3) Free accessibility and performance audits; scores to report

### Takeaway
Run Lighthouse (Chrome DevTools) and axe DevTools/WAVE, add W3C Easy Checks and a keyboard-only pass, report the category scores plus the number of remaining issues, and state that automated tools cover only part of WCAG.

### Cited Findings
- W3C's Easy Checks are a quick first review (alt text, title, headings, contrast, skip link, keyboard focus, language, zoom, form labels) and explicitly not a full audit. — [W3C WAI easy checks](https://www.w3.org/WAI/test-evaluate/easy-checks/)

### Inferences
(From general knowledge, not fetched this session; I did not open Lighthouse, axe or WAVE docs.)
- Report: Lighthouse Accessibility, Performance, Best Practices, SEO scores (mobile and desktop); axe violations count by impact (target 0 critical/serious); WAVE errors and contrast errors (target 0); manual: keyboard-only navigation of every task, visible focus, 200% zoom, colour not the only signal on charts, screen-reader spot check with one tool. Target WCAG 2.2 AA on tested pages.
- Say "no violations found by automated checks" rather than "WCAG 2.2 AA conformant"; list manual checks done.
- Performance: report Lighthouse LCP/TBT/CLS, and note the 3D/visualisation load on mid-range hardware.

### Gaps
- Did not verify current Lighthouse/axe/WAVE versions or WCAG 2.2 AA criterion list from W3C; no scores exist yet for this app.
