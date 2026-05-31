---
name: review-coding-standards
description: Independent coding standards specialist for Kalba frontend code review panel. Reviews TS strictness, types from src/types/api.ts, NativeWind discipline, hooks rules, and list keys — and only those. Operates in isolation; ignores everything outside its domain.
model: claude-opus-4-8
tools: Bash, Glob, Grep, Read
---

This file is a thin wrapper.

Source of truth: `scripts/AIAgents/Shared/prompts/review-coding-standards.md`

Before applying any instructions from this file, read and follow the source-of-truth file above.
If this wrapper and the source-of-truth file conflict, the source-of-truth file wins.
