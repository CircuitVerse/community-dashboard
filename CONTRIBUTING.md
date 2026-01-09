# Contributing to CircuitVerse Community Dashboard

Thank you for considering contributing to the CircuitVerse Community Dashboard! 🎉

We welcome contributions from everyone, whether you're fixing a bug, improving documentation, or adding a new feature. This guide will help you get started.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Guidelines](#issue-guidelines)
- [Code Style](#code-style)
- [Need Help?](#need-help)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and considerate in all interactions.

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Git**

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/community-dashboard.git
cd community-dashboard
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/CircuitVerse/community-dashboard.git
```

---

## ⚙️ Development Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables (optional):**

If you need to generate leaderboard data locally, create a `.env.local` file:

```env
GITHUB_TOKEN=ghp_your_token_here
```

3. **Start the development server:**

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🤝 How to Contribute

### Finding Issues

- Browse our [open issues](https://github.com/CircuitVerse/community-dashboard/issues)
- Look for issues labeled `good first issue` for beginner-friendly tasks
- Check for issues labeled `help wanted` for priority tasks

### Claiming an Issue

#### To claim an issue:

Comment on the issue with:

```
@bot assign
```

The bot will automatically assign you to the issue if:

- ✅ The issue is not already assigned to someone else
- ✅ You don't have any other open issues assigned to you

#### To unclaim an issue:

If you can no longer work on an issue, comment:

```
@bot unclaim
```

This will remove you from the issue and make it available for others.

#### Rules

| Rule                         | Description                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **One issue at a time**      | You can only be assigned to one open issue at a time. Complete or unclaim your current issue before claiming a new one. |
| **First come, first served** | Issues are assigned to the first person who claims them.                                                                |
| **In Progress label**        | When assigned, the issue automatically gets the `in progress` label.                                                    |

### Contributing Without an Issue

For small fixes (typos, minor improvements), you can submit a PR directly. For larger changes, please open an issue first to discuss your approach.

---

## 📝 Pull Request Guidelines

### Before Submitting

1. **Sync your fork** with the latest changes from upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **Create a feature branch:**

```bash
git checkout -b feat/your-feature-name
```

3. **Make your changes** and test them locally

4. **Run linting and tests:**

```bash
npm run lint
npm run build
```

### Submitting Your PR

1. Push your branch to your fork:

```bash
git push origin feat/your-feature-name
```

2. Open a Pull Request against the `main` branch

3. Fill out the PR template with:
   - A clear description of what changes you made
   - Reference to the issue it addresses (e.g., `Fixes #123`)
   - Screenshots/recordings for UI changes

### PR Review Process

- PRs require approval from at least one maintainer
- Address any feedback promptly
- Keep your PR focused - one feature/fix per PR
- Keep your PR small when possible

---

## 💬 Commit Message Guidelines

We follow **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `feat`     | A new feature                            |
| `fix`      | A bug fix                                |
| `docs`     | Documentation changes                    |
| `style`    | Code style changes (formatting, etc.)    |
| `refactor` | Code refactoring without feature changes |
| `test`     | Adding or updating tests                 |
| `chore`    | Maintenance tasks (build, deps, etc.)    |

### Examples

```
feat(leaderboard): add contributor heatmap component

fix(ui): resolve dark mode toggle flicker

docs: update contributing guidelines
```

---

## 🐛 Issue Guidelines

### Reporting Bugs

When reporting a bug, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Browser/OS information

### Requesting Features

When requesting a feature:

- Describe the problem you're trying to solve
- Explain your proposed solution
- Consider alternative approaches
- Add mockups or examples if helpful

---

## 🎨 Code Style

### General Guidelines

- Use **TypeScript** for type safety
- Follow existing code patterns and structure
- Use **Tailwind CSS** for styling
- Write descriptive variable and function names
- Add comments for complex logic

### File Organization

- Components go in `components/`
- Utility functions go in `lib/`
- Types go in `types/`
- API routes go in `app/api/`

### Formatting

The project uses ESLint for linting. Run the linter before committing:

```bash
npm run lint
```

---

## ❓ Need Help?

- **Slack:** Join the CircuitVerse Slack workspace for real-time discussions
- **GitHub Discussions:** For general questions and ideas
- **Issues:** For specific problems or feature requests

---

## 🙏 Thank You!

Your contributions make CircuitVerse better for everyone. We appreciate your time and effort!

Happy Contributing! 🚀
