# Issue & PR Label Guide

This document defines the labeling system used for **issues and pull requests** in the **community-dashboard** repository.

The goal is to:
- Keep issue triaging consistent
- Improve clarity and discoverability
- Help contributors quickly find the right issues
- Make maintenance and reviews smoother

Labels are applied **after checking for duplicates, verifying reproducibility, and ensuring the issue focuses on a single concern**. If an issue covers multiple concerns, it should be split.

---

## Status Labels

These labels represent the **current lifecycle state** of an issue or PR.

| Label | Description |
|------|------------|
| `pending` | Issue has been reported and is awaiting initial triage. |
| `in progress` | Work on the issue or PR has started. |
| `blocked` | Progress is blocked due to an external dependency or unresolved blocker. |
| `duplicate` | Issue or PR already exists elsewhere. |
| `wontfix` | Will not be worked on due to blockers, scope, or project decisions. |
| `stale` | No activity for a long time; may be closed if no updates occur. |

---

## Type Labels

These labels describe **what kind of change or problem** the issue/PR represents.

| Label | Description |
|------|------------|
| `bug` | Something is broken or not working as intended. |
| `enhancement` | Improvement to existing functionality or behavior. |
| `feature` | Request for new functionality. |
| `documentation` | Documentation-related issues or updates. |
| `ui/ux` | User interface or user experience issues. |
| `responsiveness` | Issues related to layout, responsiveness, or device compatibility. |
| `security` | Potential security risks or vulnerabilities. |
| `question` | Further clarification or information is required. |

---

## Area Labels

These labels indicate **which part of the codebase** is affected.

| Label | Description |
|------|------------|
| `javascript` | Pull requests that update or modify JavaScript code. |
| `script` | Pull requests that update scripts (build, CI, automation, etc.). |
| `dependencies` | Pull requests that update or manage dependencies. |

---

## Beginner-Friendly Labels

These labels help contributors identify suitable issues.

| Label | Description |
|------|------------|
| `good first issue` | Beginner-friendly issue with clear scope. |
| `help wanted` | Maintainers welcome external contributions on this issue. |

---

## Effort Labels

These labels indicate **estimated effort or complexity**.

| Label | Description |
|------|------------|
| `easy` | Simple fix or change; minimal context required. |
| `medium` | Moderate complexity; some familiarity with the codebase needed. |
| `hard` | Complex issue requiring deep understanding or significant changes. |

---

## Pull Request Labels

### PR Status

| Label | Description |
|------|------------|
| `review-ready` | Pull request is ready for review. |
| `approved` | Pull request has been reviewed and approved. |

### PR Priority

| Label | Description |
|------|------------|
| `P0` | Critical fix; requires immediate attention. |
| `P1` | High priority but not blocking. |
| `P2` | Normal priority. |
