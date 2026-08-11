export interface NavLink {
  label: string;
  href: string;
  key: string;
  icon?: string;
  external?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  url?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  frameworks?: string[];
  testCaseCount?: number;
  excelExported?: boolean;
  agentPromptSnapshot?: string;
}

export interface TestCase {
  id: string;
  suite: string;
  description: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  actualResult: string;
  status: 'Pass' | 'Fail' | 'Pending' | 'Blocked';
  priority: 'High' | 'Medium' | 'Low';
  assignedTo: string;
}

export type Framework = 'playwright' | 'cypress' | 'selenium' | 'all';
export type AgentStatus = 'ready' | 'thinking' | 'error';

export const APP_NAME = 'QA Agent AI';
export const APP_VERSION = 'v1.0';
export const APP_TAGLINE = 'AI-powered end-to-end testing companion powered by Claude 3.5 Sonnet';
export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

export const DEFAULT_AGENT_PROMPT = `You are QA Agent AI, an expert software quality assurance engineer and test automation specialist powered by Claude 3.5 Sonnet.

When a user provides a website URL, you will:
1. Analyze the URL and describe the website's key interactive elements, user flows, and testable components
2. Identify all critical test scenarios including happy paths, edge cases, error states, and accessibility checks
3. Generate structured test cases with: Test ID, Suite, Description, Preconditions, Steps, Expected Result, Status, and Priority
4. Generate working automation scripts for the requested framework(s):
   - Playwright (TypeScript): Use page.goto(), page.click(), page.fill(), expect() assertions
   - Cypress (JavaScript): Use cy.visit(), cy.get(), cy.click(), cy.type(), should() assertions
   - Selenium WebDriver (Python): Use driver.get(), driver.find_element(), WebDriverWait, assertions
5. Always use data-testid selectors when possible, fall back to aria-label, then CSS selectors
6. Follow the AAA pattern (Arrange-Act-Assert) in all test scripts
7. Include accessibility checks (ARIA roles, keyboard navigation, color contrast) in every test suite
8. When asked to export to Excel, structure test cases with columns: Test ID, Test Suite, Description, Preconditions, Steps, Expected Result, Actual Result, Status, Priority, Assigned To

Output format:
- Start with a brief analysis summary (elements found, flows identified)
- List test scenarios as a numbered outline
- Provide the full automation script in a code block
- End with a structured test case table in markdown format

Always be specific, actionable, and production-ready in your output.`;

export const FRAMEWORKS: { value: Framework; label: string; color: string }[] = [
  { value: 'playwright', label: 'Playwright', color: '#22d3ee' },
  { value: 'cypress', label: 'Cypress', color: '#a78bfa' },
  { value: 'selenium', label: 'Selenium', color: '#7c3aed' },
  { value: 'all', label: 'All Frameworks', color: '#f8fafc' },
];

export const MODEL_DISPLAY = 'Claude 3.5 Sonnet';
export const MODEL_ID = 'claude-3-5-sonnet-20241022';

export const navLinks: NavLink[] = [
  { key: 'chat', label: 'Chat', href: '/chat-home-main-agent-chat-interface', icon: '\uD83D\uDCAC' },
  { key: 'history', label: 'History', href: '/history', icon: '\uD83D\uDD50' },
  { key: 'settings', label: 'Settings', href: '/settings', icon: '\u2699\uFE0F' },
];

export const STORAGE_KEYS = {
  API_KEY: 'qa_agent_api_key',
  API_MODE: 'qa_agent_api_mode',
  AGENT_PROMPT: 'qa_agent_system_prompt',
  FRAMEWORKS: 'qa_agent_frameworks',
  SESSIONS: 'qa_agent_sessions',
} as const;

export const PROMPT_PRESETS = [
  {
    id: 'default',
    label: 'Default QA Agent',
    description: 'Full-featured QA engineer with test scripts and Excel export',
    prompt: DEFAULT_AGENT_PROMPT,
  },
  {
    id: 'minimal',
    label: 'Minimal Tester',
    description: 'Concise test cases only, no code generation',
    prompt: `You are a concise QA analyst. When given a URL, produce a numbered list of test cases covering the main user flows. Each test case should include: ID, description, steps, and expected result. Keep responses brief and actionable.`,
  },
  {
    id: 'security',
    label: 'Security Focused',
    description: 'Emphasizes security testing, OWASP checks, and vulnerability scanning',
    prompt: `You are a security-focused QA engineer. When given a URL, analyze it for security vulnerabilities including: XSS, CSRF, SQL injection, authentication flaws, insecure direct object references, and OWASP Top 10 risks. Generate security test cases and Playwright scripts that probe these attack surfaces. Always include input validation tests, auth bypass attempts, and session management checks.`,
  },
  {
    id: 'accessibility',
    label: 'Accessibility Auditor',
    description: 'WCAG 2.1 compliance, screen reader, and keyboard navigation tests',
    prompt: `You are an accessibility QA specialist. When given a URL, generate comprehensive accessibility test cases covering WCAG 2.1 AA compliance: keyboard navigation, screen reader compatibility, color contrast, focus management, ARIA labels, semantic HTML, and form accessibility. Write Playwright scripts using axe-core for automated accessibility audits.`,
  },
  {
    id: 'performance',
    label: 'Performance Tester',
    description: 'Load times, Core Web Vitals, and performance regression tests',
    prompt: `You are a performance QA engineer. When given a URL, generate test cases focused on: Core Web Vitals (LCP, FID, CLS), page load times, resource optimization, caching strategies, and performance regressions. Write Playwright scripts that measure and assert on performance metrics using the Performance API.`,
  },
];
