---
title: "What Websites Know About You - Search Indexing and Browser Scanning"
date: "2026-04-03"
summary: "A deep dive into Google Search Console URL removal led me to think about information persistence on the web. Combined with LinkedIn's browser scanning scandal."
---

## The trigger

Yesterday, I dealt with deleted pages persisting in Google Search results. Fixed it with Search Console removal requests, but it got me thinking about a bigger problem: information you thought was gone, staying alive on the web.

## How Google Search Console works

### What is indexing?

Google's crawler (Googlebot) crawls the web and registers discovered pages in its "index." Search results show pages from this index.

The key insight: **deleting a page doesn't automatically delete the index entry.** It stays in search results until Googlebot's next visit confirms a 404.

### Four layers of URL removal

Removing unwanted pages from search results requires multiple layers:

1. **Delete the page itself** - Remove the source
2. **robots.txt** - Block crawler access
3. **Search Console removal request** - Immediately removes from index (temporary, ~6 months)
4. **noindex meta tag** - Permanently prevents indexing if the page still exists

`robots.txt` alone isn't enough. Even when blocked, crawlers can discover URLs through external links and keep them indexed.

### The role of sitemaps

A sitemap declares "these are the pages on this site." Submitting a new sitemap signals to Google that pages not on the list may be obsolete. Always pair deletion with a fresh sitemap submission.

## Meanwhile, LinkedIn is searching your browser

On the same day, Hacker News surfaced a massive story: LinkedIn has been covertly scanning users' browser extensions.

### What's happening

Every time you visit linkedin.com, hidden code detects browser extensions installed on your machine and transmits that data to LinkedIn's servers and third-party companies.

### Why it's serious

LinkedIn knows each user's real name, employer, and job title. This means:

- **Religious extensions** (Muslim prayer time alerts, etc.) → reveals an identified person's religious beliefs
- **Accessibility extensions** (dyslexia aids, etc.) → reveals an identified person's disabilities
- **Job search tools** (509 detected) → reveals who is secretly job hunting, on the same platform where their current boss can see their profile

Under EU law, these are "prohibited categories" of data. Collecting them at all is illegal.

### Corporate espionage angle

LinkedIn also detects 200+ competing sales tools. Combined with employer data, this lets LinkedIn **map which companies use which competitor products** across its entire user base.

Reports indicate LinkedIn has used this data to send legal threats to users of third-party tools.

The scan list grew from ~461 products in 2024 to over 6,000 by February 2026.

### The EU regulation contradiction

The EU ordered LinkedIn under the DMA to open its platform to third-party tools. LinkedIn's response:

- Public API: ~0.07 calls/sec
- Internal API (Voyager): 163,000 calls/sec
- Mentions of "Voyager" in LinkedIn's 249-page compliance report: 0

Instead of opening up, LinkedIn expanded surveillance of the exact tools the regulation was designed to protect.

## The common thread

Google Search Console and LinkedIn's scanning reveal the same underlying problem: **controlling information on the web is harder than you think.**

- Deleted pages persist in search results
- Your browser contents are being read without your knowledge
- Data collection happens outside of what privacy policies disclose

What engineers can do:
- **Minimize published information from the start.** Removing it later is hard
- **Layer your defenses: robots.txt, noindex, Search Console removal.** One alone isn't enough
- **Browser extensions are a profiling vector.** Separate work and personal browsers
- **In your own products, never collect data without disclosure.** Trust, once lost, doesn't come back

---

The web isn't a binary of "public" and "private." The gray area in between is the most dangerous -- and the hardest to see.
