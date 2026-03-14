/**
 * WF26 CIE — Workflow Registry
 * Location: src/trigger/wf26-cie-workflow-registry.ts
 *
 * Central registry of all 29 Maps Autopilot workflows with their external
 * dependencies and sensitivity mappings. Used by the Content Intelligence
 * Engine to determine which workflows are affected by external changes
 * (e.g. Google algorithm updates, API deprecations) and which workflows
 * share common dependencies.
 *
 * Pure config file — no runtime dependencies, no Trigger.dev SDK needed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowEntry {
  /** Workflow identifier, e.g. "WF01" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Trigger.dev task ID, e.g. "wf01-client-onboarding" */
  taskId: string;
  /** External service dependencies */
  dependencies: string[];
  /** External changes that affect this workflow */
  sensitive_to: string[];
  /** Pricing tier: core, premium, or full_seo */
  tier: "core" | "premium" | "full_seo";
  /** Cron expression if the workflow runs on a schedule */
  schedule?: string;
}

// ---------------------------------------------------------------------------
// Canonical lists (exported for validation / UI use)
// ---------------------------------------------------------------------------

export const DEPENDENCY_TYPES = [
  "google_places_api",
  "gbp_api",
  "claude_api",
  "brightlocal_api",
  "ghl_api",
  "late_dev_api",
  "kie_ai_api",
  "bannerbear_api",
  "brave_search_api",
  "perplexity_api",
  "smtp",
  "wordpress_api",
  "stripe_api",
] as const;

export const SENSITIVITY_TYPES = [
  "google_algorithm",
  "gbp_features",
  "review_policy",
  "ai_search",
  "content_guidelines",
  "api_deprecation",
  "pricing_changes",
] as const;

export type DependencyType = (typeof DEPENDENCY_TYPES)[number];
export type SensitivityType = (typeof SENSITIVITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const WORKFLOW_REGISTRY: readonly WorkflowEntry[] = [
  {
    id: "WF01",
    name: "Client Onboarding",
    taskId: "wf01-client-onboarding",
    dependencies: ["ghl_api", "claude_api", "google_places_api"],
    sensitive_to: ["gbp_features"],
    tier: "core",
    // webhook-triggered
  },
  {
    id: "WF01B",
    name: "Website Health Check",
    taskId: "wf01b-website-health-check",
    dependencies: [],
    sensitive_to: ["google_algorithm"],
    tier: "core",
    // on-demand
  },
  {
    id: "WF02",
    name: "Content Engine",
    taskId: "wf02-content-engine",
    dependencies: ["claude_api", "kie_ai_api", "bannerbear_api", "late_dev_api"],
    sensitive_to: ["gbp_features", "content_guidelines", "google_algorithm"],
    tier: "core",
    schedule: "0 9 * * 1,3,5", // Mon/Wed/Fri at 9am
  },
  {
    id: "WF03",
    name: "Review Monitor",
    taskId: "wf03-review-monitor",
    dependencies: ["brightlocal_api", "claude_api"],
    sensitive_to: ["review_policy", "google_algorithm"],
    tier: "core",
    schedule: "0 */2 * * *", // every 2 hours
  },
  {
    id: "WF04",
    name: "Review Request NPS",
    taskId: "wf04-review-request-nps",
    dependencies: ["ghl_api"],
    sensitive_to: ["review_policy"],
    tier: "core",
    // webhook-triggered
  },
  {
    id: "WF05",
    name: "Monthly Reports",
    taskId: "wf05-monthly-reports",
    dependencies: ["claude_api", "smtp"],
    sensitive_to: ["google_algorithm"],
    tier: "core",
    schedule: "0 8 1 * *", // 1st of each month at 8am
  },
  {
    id: "WF06",
    name: "Photo Upload Handler",
    taskId: "wf06-photo-upload-handler",
    dependencies: ["late_dev_api"],
    sensitive_to: ["gbp_features"],
    tier: "core",
    // webhook-triggered
  },
  {
    id: "WF07",
    name: "Citation Builder",
    taskId: "wf07-citation-builder",
    dependencies: ["brightlocal_api"],
    sensitive_to: ["api_deprecation"],
    tier: "core",
    schedule: "0 6 * * 0", // weekly, Sunday 6am
  },
  {
    id: "WF08",
    name: "Client Health Check",
    taskId: "wf08-client-health-check",
    dependencies: ["claude_api"],
    sensitive_to: ["google_algorithm"],
    tier: "core",
    schedule: "0 7 * * *", // daily at 7am
  },
  {
    id: "WF09",
    name: "Onboarding Completion",
    taskId: "wf09-onboarding-completion",
    dependencies: ["smtp"],
    sensitive_to: [],
    tier: "core",
    schedule: "0 8 * * *", // daily at 8am
  },
  {
    id: "WF10",
    name: "Payment Failure Handler",
    taskId: "wf10-payment-failure-handler",
    dependencies: ["stripe_api", "ghl_api", "smtp"],
    sensitive_to: ["pricing_changes"],
    tier: "core",
    // webhook-triggered
  },
  {
    id: "WF11",
    name: "Sales Quick Audit",
    taskId: "wf11-sales-quick-audit",
    dependencies: ["google_places_api", "claude_api"],
    sensitive_to: ["google_algorithm"],
    tier: "core",
    // webhook-triggered
  },
  {
    id: "WF12",
    name: "Pre-Call Scoring",
    taskId: "wf12-pre-call-pipeline",
    dependencies: ["claude_api"],
    sensitive_to: ["google_algorithm"],
    tier: "core",
    // on-demand
  },
  {
    id: "WF13",
    name: "Citation Link Builder",
    taskId: "wf13-citation-link-builder",
    dependencies: ["claude_api"],
    sensitive_to: ["api_deprecation"],
    tier: "premium",
    schedule: "0 6 * * 1", // weekly, Monday 6am
  },
  {
    id: "WF14",
    name: "Competitor Monitoring",
    taskId: "wf14-competitor-monitoring",
    dependencies: ["google_places_api"],
    sensitive_to: ["google_algorithm", "ai_search"],
    tier: "premium",
    schedule: "0 5 * * 2", // weekly, Tuesday 5am
  },
  {
    id: "WF15",
    name: "Geo Grid Tracker",
    taskId: "wf15-geo-grid-tracker",
    dependencies: ["google_places_api"],
    sensitive_to: ["google_algorithm"],
    tier: "premium",
    schedule: "0 4 * * 3", // weekly, Wednesday 4am
  },
  {
    id: "WF16",
    name: "Review Velocity Tracker",
    taskId: "wf16-review-velocity-tracker",
    dependencies: ["brightlocal_api"],
    sensitive_to: ["review_policy"],
    tier: "premium",
    schedule: "0 6 * * *", // daily at 6am
  },
  {
    id: "WF17",
    name: "Content Gap Analysis",
    taskId: "wf17-content-gap-analysis",
    dependencies: ["perplexity_api", "claude_api"],
    sensitive_to: ["ai_search", "content_guidelines"],
    tier: "premium",
    schedule: "0 5 * * 4", // weekly, Thursday 5am
  },
  {
    id: "WF18",
    name: "GBP Completeness Audit",
    taskId: "wf18-gbp-completeness-audit",
    dependencies: ["gbp_api"],
    sensitive_to: ["gbp_features"],
    tier: "premium",
    schedule: "0 5 * * 5", // weekly, Friday 5am
  },
  {
    id: "WF19",
    name: "Schema Markup Generator",
    taskId: "wf19-schema-markup-generator",
    dependencies: ["claude_api"],
    sensitive_to: ["google_algorithm"],
    tier: "premium",
    // on-demand
  },
  {
    id: "WF20",
    name: "Entity Authority Builder",
    taskId: "wf20-entity-authority-builder",
    dependencies: ["claude_api"],
    sensitive_to: ["ai_search"],
    tier: "full_seo",
    schedule: "0 4 1 * *", // monthly, 1st at 4am
  },
  {
    id: "WF21",
    name: "Local Link Builder",
    taskId: "wf21-local-link-builder",
    dependencies: ["claude_api", "perplexity_api"],
    sensitive_to: ["google_algorithm"],
    tier: "full_seo",
    schedule: "0 4 8 * *", // monthly, 8th at 4am
  },
  {
    id: "WF22",
    name: "AI Search Visibility Audit",
    taskId: "wf22-ai-search-visibility-audit",
    dependencies: ["perplexity_api", "claude_api"],
    sensitive_to: ["ai_search"],
    tier: "full_seo",
    schedule: "0 4 15 * *", // monthly, 15th at 4am
  },
  {
    id: "WF23",
    name: "Full SEO Keyword Research",
    taskId: "wf23-full-seo-keyword-research",
    dependencies: ["perplexity_api", "claude_api"],
    sensitive_to: ["google_algorithm", "ai_search"],
    tier: "full_seo",
    // on-demand
  },
  {
    id: "WF24",
    name: "Automated Content Writer",
    taskId: "wf24-automated-content-writer",
    dependencies: ["claude_api", "wordpress_api"],
    sensitive_to: ["content_guidelines", "google_algorithm"],
    tier: "full_seo",
    schedule: "0 3 * * 1", // weekly, Monday 3am
  },
  {
    id: "WF25",
    name: "Batch Review Request",
    taskId: "wf25-batch-review-request",
    dependencies: ["ghl_api"],
    sensitive_to: ["review_policy"],
    tier: "core",
    schedule: "0 10 * * *", // daily at 10am
  },
  {
    id: "WF25A",
    name: "Daily Owner Reminder",
    taskId: "wf25a-daily-owner-reminder",
    dependencies: ["ghl_api"],
    sensitive_to: [],
    tier: "core",
    schedule: "0 9 * * *", // daily at 9am
  },
  {
    id: "WF25B",
    name: "Batch Processor",
    taskId: "wf25b-batch-processor",
    dependencies: ["ghl_api"],
    sensitive_to: ["review_policy"],
    tier: "core",
    // on-demand
  },
  {
    id: "WF25C",
    name: "NPS Handler",
    taskId: "wf25c-nps-handler",
    dependencies: ["ghl_api"],
    sensitive_to: ["review_policy"],
    tier: "core",
    // webhook-triggered
  },
] as const;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Returns all workflows sensitive to a given external change type.
 * Example: getAffectedWorkflows("google_algorithm") returns all workflows
 * that may need attention when Google changes its algorithm.
 */
export function getAffectedWorkflows(changeType: string): WorkflowEntry[] {
  return WORKFLOW_REGISTRY.filter((wf) =>
    wf.sensitive_to.includes(changeType)
  );
}

/**
 * Returns all workflows that depend on a given external service.
 * Example: getWorkflowsByDependency("claude_api") returns every workflow
 * that calls the Anthropic API.
 */
export function getWorkflowsByDependency(dep: string): WorkflowEntry[] {
  return WORKFLOW_REGISTRY.filter((wf) => wf.dependencies.includes(dep));
}
