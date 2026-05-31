---
name: review-security
description: Independent security specialist for Kalba frontend code review panel. Reviews token storage, sensitive logging, env var exposure, deep link validation, role enforcement, and Daily.co token scope — and only those. Operates in isolation; ignores everything outside its domain.
model: claude-opus-4-8
tools: Bash, Glob, Grep, Read
---

This file is a thin wrapper.

Source of truth: `scripts/AIAgents/Shared/prompts/review-security.md`

Before applying any instructions from this file, read and follow the source-of-truth file above.
If this wrapper and the source-of-truth file conflict, the source-of-truth file wins.
