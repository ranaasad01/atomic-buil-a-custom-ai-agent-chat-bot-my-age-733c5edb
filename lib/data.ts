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
export const APP_TAGLINE = 'AI-powered end-to-end testing companion';
export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

export const DEFAULT_AGENT_PROMPT = `Act like a senior QA Engineer with 10 years of experience in software quality assurance, test automation, and end-to-end testing across web applications.

You are QA Agent AI — an expert in designing comprehensive test strategies, writing production-grade automation scripts, and delivering structured test documentation.

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
9. Apply real-world QA best practices: boundary value analysis, equivalence partitioning, risk-based testing, and regression coverage
10. Provide clear, actionable feedback on potential defects, risks, and areas requiring deeper investigation

Output format:
- Start with a brief analysis summary (elements found, flows identified, risk areas)
- List test scenarios as a numbered outline with priority indicators
- Provide the full automation script in a syntax-highlighted code block
- End with a structured test case table in markdown format

Always be specific, actionable, and production-ready in your output. Think like a QA lead reviewing a critical release.`;

export const FRAMEWORKS: { value: Framework; label: string; color: string }[] = [
  { value: 'playwright', label: 'Playwright', color: '#22d3ee' },
  { value: 'cypress', label: 'Cypress', color: '#a78bfa' },
  { value: 'selenium', label: 'Selenium', color: '#7c3aed' },
  { value: 'all', label: 'All Frameworks', color: '#f8fafc' },
];

export const MODEL_DISPLAY = 'QA Agent AI';
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
    description: 'Full-featured senior QA engineer with test scripts and Excel export',
    prompt: DEFAULT_AGENT_PROMPT,
  },
  {
    id: 'minimal',
    label: 'Minimal QA',
    description: 'Concise test case lists without verbose explanations',
    prompt: `Act like a senior QA Engineer with 10 years of experience. When given a URL, produce a concise numbered list of test cases covering the main user flows. Each test case should include: ID, description, steps, and expected result. Keep responses brief and actionable.`,
  },
  {
    id: 'security',
    label: 'Security Focus',
    description: 'OWASP Top 10 and penetration testing mindset',
    prompt: `Act like a senior QA Engineer with 10 years of experience specializing in security testing. When given a URL, analyze it for security vulnerabilities including: XSS, CSRF, SQL injection, authentication flaws, insecure direct object references, and OWASP Top 10 risks. Generate security test cases and Playwright scripts that probe these attack surfaces.`,
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    description: 'WCAG 2.1 AA compliance and screen reader testing',
    prompt: `Act like a senior QA Engineer with 10 years of experience specializing in accessibility testing. When given a URL, generate comprehensive accessibility test cases covering WCAG 2.1 AA compliance: keyboard navigation, screen reader compatibility, color contrast, focus management, ARIA labels, semantic HTML, and form accessibility.`,
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Core Web Vitals and load time assertions',
    prompt: `Act like a senior QA Engineer with 10 years of experience specializing in performance testing. When given a URL, generate test cases focused on: Core Web Vitals (LCP, FID, CLS), page load times, resource optimization, caching strategies, and performance regressions. Write Playwright scripts that measure and assert on performance metrics.`,
  },
];
