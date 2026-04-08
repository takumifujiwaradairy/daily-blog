---
title: "AI Autonomously Found a 27-Year-Old Vulnerability"
date: "2026-04-09"
summary: "What Anthropic's Project Glasswing tells us about the turning point in AI cybersecurity"
---

## What Happened

Anthropic used an unreleased frontier model called "Claude Mythos Preview" to find thousands of zero-day vulnerabilities in every major operating system and web browser. Almost all of them were found autonomously — no human steering required.

Some examples:

- **OpenBSD** — a 27-year-old vulnerability. An attacker could remotely crash any machine just by connecting to it
- **FFmpeg** — a 16-year-old vulnerability. Automated testing tools had hit the same line of code five million times without catching it
- **Linux kernel** — the model autonomously chained multiple vulnerabilities together to escalate from a regular user to full root access

OpenBSD is known as one of the most security-hardened operating systems in the world. FFmpeg is used by virtually every video player. Linux runs most of the world's servers. All of these codebases have been reviewed by countless humans over decades.

## Why This Matters

The window between discovering a vulnerability and exploiting it is collapsing from months to minutes.

Until now, finding critical vulnerabilities required deep expertise and enormous amounts of time. That created a natural ceiling on attack frequency. AI removes that ceiling. The cost of attacks drops dramatically.

Anthropic's response is Project Glasswing — a coalition to give defenders AI capabilities first. Twelve launch partners including AWS, Apple, Google, Microsoft, CrowdStrike, and the Linux Foundation, expanding to over 40 organizations. Anthropic committed $100M in usage credits and $4M in donations to open-source security organizations.

## What This Means for Engineers

**"Humans reviewed it, so it's safe" no longer holds.** A 27-year-old vulnerability survived review by the world's best security experts. Human review has limits.

**Open source is the most vulnerable.** Maintainers without dedicated security teams manage code that runs the world's infrastructure. AI-powered scanning could be their greatest ally.

**Security can't be bolted on after the fact.** In the AI era, secure-by-design isn't optional — it's the baseline.

Yesterday I wrote about how "[you can't design a database without domain knowledge](/en/2026-04-08)" — a lesson I learned from my own product's DB design. Reading about Project Glasswing today, I think the same principle applies to security. If you don't understand vulnerability patterns, you can't write secure code. AI is starting to bridge that knowledge gap.

Defense and offense are two sides of the same coin. This trend isn't stopping. As engineers, we need to be ready to stand on the defense side.
