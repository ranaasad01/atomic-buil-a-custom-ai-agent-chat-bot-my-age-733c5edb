# AGENTS.md

Project conventions for AI agents and humans editing this codebase.

## Original request
buil a custom AI agent chat bot , my agent work is that i give him a URL of any live website it end to end test , write test script for automation , prepare excel sheet for test cases etc as per user instructions

Additional details provided by the user:
- Which AI provider / model should power the agent?: Anthropic Claude 3.5 Sonnet
- Which test automation framework should the agent generate scripts for?: All of the above
- How should the API key be provided?: Both options available
- Any extra capabilities you want the agent to have?: will able to edit agent via edit prompts instructions

## Goal
Build QA Agent AI — a dark glass-futuristic chatbot powered by Claude 3.5 Sonnet that accepts a website URL, performs end-to-end test analysis, generates Playwright/Cypress/Selenium scripts, and exports Excel test case sheets, with editable agent prompts and API key configuration.

## Project type
saas-app

## Design system — match this exactly
- Color tokens: `--background: #0f0f1a`, `--card: #1a1a2e`, `--border: #2e2e4a`, `--foreground: #f8fafc`, `--muted-foreground: #a0a0c0`, `--primary: #7c3aed`, `--accent: #22d3ee`, `--primary-light: #a78bfa`, `--destructive: #dc2626`

## Existing components — reuse these, don't create near-duplicates
- Footer (components/Footer.tsx)
- LanguageToggle (components/LanguageToggle.tsx)
- LocaleProvider (components/LocaleProvider.tsx)
- Navbar (components/Navbar.tsx)

## Existing i18n namespaces
Every translation key must be namespaced (`hero.title`, never a bare `title`) so two components never collide on the same catalog slot. Reuse one of these, or pick a new, distinct name:
`chat`, `cta`, `features`, `footer`, `frameworks`, `hero`, `history`, `historyPage`, `howItWorks`, `nav`, `settings`, `settingsPage`, `testimonials`

When editing or adding pages: preserve the design system above, reuse existing components and the shared nav data file, and keep the established structure and tone.
