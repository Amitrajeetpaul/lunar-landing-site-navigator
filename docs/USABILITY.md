# Usability evaluation protocol

No mission planner, teacher or student has tested Lunar Navigator yet. This page is a ready-to-run, one-hour protocol so the team (or anyone) can produce real evidence, plus an honest heuristic self-review. Treat the self-review as the builder's own opinion, not independent evidence.

## 1. Session plan (3 to 5 people, 15 minutes each)

Nielsen Norman Group's model (1 − 0.69⁵ ≈ 85% of problems found by 5 users) is a rule of thumb for *one distinct user group*, so test 3 to 5 people per group you care about: a planner-type user, a student or teacher, and a member of the public. Use the live app (https://lunar-landing-site-navigator-beige.vercel.app), a laptop, and ask each person to think aloud. Do not explain the app first. Note where they hesitate.

## 2. Tasks and success criteria

| # | Task (read aloud) | Success | Where it lives |
|---|---|---|---|
| 1 | "Which of the eight candidate sites gives the most time with both Sun and Earth available over the next 30 days?" | Finds the BEST-marked card in under 2 minutes | Compare → All presets, same date |
| 2 | "Shackleton ridge: what is the best day to start a 30-day mission in the next 4 months?" | Runs the scan and names the top date | Compare → best start-date finder |
| 3 | "If a relay satellite kept Earth in contact all the time, what would change at this site?" | Switches the relay option and reads the new numbers | Verdict → relay |
| 4 | "Right now, how long until the Sun sets here?" | Reads the countdown | Verdict or Timeline → Right now |
| 5 | "Why can't Chang'e-4 talk to Earth directly?" | Selects the site and explains the far side (Earth 0%) | Site → landings, Verdict |
| 6 | "Send a colleague exactly what you are looking at." | Copies the shareable link | Verdict → Copy shareable link |

Record per task: success (yes / with help / no), time, errors, and a quote.

## 3. System Usability Scale (SUS)

After the tasks, each participant rates the 10 statements from 1 (strongly disagree) to 5 (strongly agree). The wording below is the standard SUS text from memory; check it against Brooke (1996) before publishing.

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

Scoring: odd items contribute (score − 1), even items contribute (5 − score); add the ten contributions and multiply by 2.5 (0 to 100). A commonly quoted average is about 68; about 80 and above is rated an A. With 5 people this is a small, formative sample: report it as such, with the individual scores.

## 4. Accessibility and performance checks (free)

- Run Lighthouse (Chrome DevTools) on the Verdict and Compare tabs and record the Accessibility and Performance scores.
- Run the axe DevTools or WAVE extension; fix or list what it finds.
- Manual: tab through a whole task with the keyboard only, zoom the browser to 200%, and test at 360 px wide.
- Report "no violations found by automated checks" at most. Automated tools are not a full WCAG 2.2 AA audit.

## 5. Heuristic self-review (Nielsen's 10, by the builder)

| Heuristic | Finding |
|---|---|
| Visibility of system status | Good: a LIVE / FALLBACK badge for the ephemeris, a terrain-loading message, a "Calculating…" message on Compare cards. Gap: long first reads of a custom site show only a text message. |
| Match with the real world | Mixed: "sunset", "Earthset", "outage" are plain, but "disc rule", "mission score weights" and "baseline" are jargon (the Learn tab explains some). |
| User control and freedom | Partial: any control can be changed again, and the link restores state. No undo; presets reset the custom coordinates. |
| Consistency and standards | Good: one card style, the same visibility rule behind every number. |
| Error prevention | Partial: custom coordinates are clamped and terrain failures show a stand-in warning. The wrong-input case has no inline message in the current build. |
| Recognition over recall | Good: sites are a list and a map; the last choices stay visible in the link. |
| Flexibility and efficiency | Good: presets for quick use, custom coordinates and weights for experts, a shareable link and a PDF report. |
| Aesthetic and minimalist design | Mixed: dense Verdict tab; the tabs split features but several cards still carry a lot of small text. |
| Help users recognise and recover from errors | Partial: terrain or Horizons failures say what happened and what the fallback is; AI brief errors fall back to the rule-based text. |
| Help and documentation | Partial: a Learn tab and a README, but no in-context help on the score or the disc rule. |

## 6. What to say to judges

State plainly what was and was not tested: automated tests of the calculation against NASA's own data and published studies, the cross-checks in the README, and (once run) a small formative usability test with the SUS score and the issues found. Do not claim user validation that has not happened.
