---
title: "Building a Multi-Agent Architecture with Claude Code"
date: "2026-04-02"
summary: "How I designed a parent-child agent delegation system across multiple repositories, enabling one person to manage an entire platform."
---

## Context

I'm building a platform consisting of multiple web applications. Repositories are split by function: auth server, shared UI library, individual apps, and documentation.

To manage all of this solo, I designed an architecture that treats Claude Code not as a chat tool, but as a programmable development team.

## Overall Structure

```
Workspace (parent)
├── App A/              # Git Submodule
├── App B/              # Git Submodule
├── App C/              # Git Submodule
├── Auth Server/        # Git Submodule
├── Shared UI Library/  # Git Submodule
├── CLAUDE.md           # Orchestration design
├── Makefile            # Batch operations
└── .claudeignore       # Exclude submodules
```

The key principle: **the parent workspace only handles design and orchestration. All implementation is delegated to child agents.**

## Design Decisions

### 1. Context Isolation

`.claudeignore` excludes all submodules. This means:
- The parent agent's context window doesn't get filled with submodule code
- `Grep` and `Glob` from the parent don't hit submodule contents
- Each child agent only sees its own repository

**Why**: Claude Code's context window is finite. Loading six apps' worth of code leaves no room for the design thinking that actually matters at the orchestration level.

### 2. Custom Agent Definitions

Each submodule has a `.claude/agents/` directory with custom agent definitions. Child agents read their repo's CLAUDE.md and work exclusively within that repo.

```
Agent tool:
  subagent_type: "app-a"
  prompt: "Investigate and fix the auth flow bug"
```

### 3. Parallel Execution Pattern

When applying the same change across multiple repos, I launch agents in parallel.

```
Agent 1: subagent_type: "app-a" → "Add teamId field to User type"
Agent 2: subagent_type: "app-b" → "Add teamId field to User type"
Agent 3: subagent_type: "app-c" → "Add teamId field to User type"
```

All three run simultaneously. What would take 30 minutes of manual work finishes in 2-3 minutes.

### 4. Commit/Push from Parent Only

Child agents may have permission constraints, so the rule is: implementation happens in child agents, commit/push happens from the parent via Bash. This is also a design choice. Commit granularity and messages should be controlled by the human (or the orchestrating parent).

## Custom Commands

Frequently used workflows are defined as custom commands.

| Command | Purpose |
|---------|---------|
| `/commit` | Conventional commits |
| `/pr` | Create pull request |
| `/push-safe` | Push with security checks |
| `/review` | AI code review |
| `/fix-ci` | Auto-fix CI failures |
| `/overnight` | Autonomous overnight execution |
| `/impl` | Feature implementation |
| `/explore-code` | Cross-codebase investigation |

`/overnight` is particularly useful. Give the agent a task before bed, wake up to a PR ready for review.

## CLAUDE.md Design

CLAUDE.md is the agent's "operations manual." It includes:

- **Workspace structure**: What lives where
- **Auth architecture**: Auth method, JWT, cookie sharing
- **Port assignments**: Local ports for each app
- **Behavioral principles**: Coding rules reference, incremental commits, auto-recovery rules
- **Delegation rules**: When to delegate to child agents vs. handle directly

Whether or not you write this makes a dramatic difference in agent output quality.

## What I've Gained

- **One person managing 6 apps + auth server + shared UI.** A physically impossible workload made possible
- **Near-zero cost for cross-repo changes.** Type changes, library updates, config changes applied across all repos at once
- **Reduced context switching.** Delegate "investigate that feature in that repo" to an agent while continuing design work

## What's Still Missing

- **Agent output quality evaluation is human-dependent.** I have a review agent, but final judgment is still mine
- **CI integration is manual.** Haven't set up headless Claude Code execution in GitHub Actions yet
- **Dependency management between agents.** "Auth server change → propagate to all apps" sequencing is still manual

## Takeaway

Claude Code can be treated as a "programmable development team," not just a convenient chat tool. This requires orchestration design, and CLAUDE.md, custom agents, and `.claudeignore` context isolation form the foundation.

Even as a solo developer, this architecture gives me the effective output of a 5-6 person team.
