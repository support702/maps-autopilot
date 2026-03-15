import { tasks, runs } from "@trigger.dev/sdk/v3";

// ── Test configuration ──────────────────────────────────────────────
const TEST_CLIENT = {
  client_id: "client-1772735253089",
  business_name: "King City Automotive",
  late_account_id: "69a89ef7dc8cab9432b88ab1",
  niche_key: "mechanical",
  city: "King City",
  email: "tom@haildentpro.com",
};

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 5 min timeout
const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CRASHED", "SYSTEM_FAILURE", "CANCELED"];

// ── Workflow definitions ────────────────────────────────────────────
interface WorkflowTest {
  id: string;
  label: string;
  taskId: string;
  payload: Record<string, unknown>;
  skip?: boolean;
  skipReason?: string;
}

const workflows: WorkflowTest[] = [
  {
    id: "WF01",
    label: "Client Onboarding",
    taskId: "wf01-client-onboarding",
    payload: {
      business_name: "Test Master Script Auto Shop",
      business_phone: "8175559999",
      business_address: "100 Main St, King City, TX 76528",
      business_website: "https://testautoshop.com",
      primary_services: "Brake Repair, Oil Change, Engine Diagnostics",
      service_area: "King City, TX",
      niche_key: "mechanical",
      years_in_business: 12,
      unique_selling_points: "ASE Certified, Same-Day Service",
      google_review_url: "https://g.page/test-master",
      contact_id: "test-master-contact",
    },
  },
  {
    id: "WF01B",
    label: "Website Health Check",
    taskId: "wf01b-website-health-check",
    payload: {
      client_id: TEST_CLIENT.client_id,
      website: "https://testautoshop.com",
      business_name: TEST_CLIENT.business_name,
    },
  },
  {
    id: "WF02",
    label: "Content Engine",
    taskId: "wf02-content-engine",
    payload: {},
    skip: true,
    skipReason: "Posts to live GMB",
  },
  {
    id: "WF03",
    label: "Review Monitor",
    taskId: "wf03-review-monitor",
    payload: {},
  },
  {
    id: "WF04",
    label: "Review Request NPS",
    taskId: "wf04-review-request-nps",
    payload: {
      client_id: TEST_CLIENT.client_id,
      customer_name: "Test Customer",
      customer_phone: "8175550001",
    },
  },
  {
    id: "WF05",
    label: "Monthly Reports",
    taskId: "wf05-monthly-reports",
    payload: {},
  },
  {
    id: "WF06",
    label: "Photo Upload Handler",
    taskId: "wf06-photo-upload-handler",
    payload: {
      client_id: TEST_CLIENT.client_id,
      photo_urls: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
      captions: ["Shop front", "Service bay"],
    },
  },
  {
    id: "WF07",
    label: "Citation Builder",
    taskId: "wf07-citation-builder",
    payload: {},
  },
  {
    id: "WF08",
    label: "Client Health Check",
    taskId: "wf08-client-health-check",
    payload: {},
  },
  {
    id: "WF09",
    label: "Onboarding Completion",
    taskId: "wf09-onboarding-completion",
    payload: {
      client_id: TEST_CLIENT.client_id,
      gbp_location_id: "test-gbp-loc-123",
      brightlocal_campaign_id: "test-bl-camp-123",
      call_tracking_number: "8175550099",
      gbp_categories_set: true,
      gbp_description_updated: true,
      gbp_photos_uploaded: true,
      gbp_products_created: true,
      gbp_services_created: true,
      gbp_qa_seeded: true,
    },
  },
  {
    id: "WF10",
    label: "Payment Failure Handler",
    taskId: "wf10-payment-failure-handler",
    payload: {
      customer_id: "cus_test_master_123",
      failure_reason: "card_declined",
      client_id: TEST_CLIENT.client_id,
    },
  },
  {
    id: "WF11",
    label: "Sales Quick Audit",
    taskId: "wf11-sales-quick-audit",
    payload: {
      business_name: "King City Automotive",
      city: "King City",
      state: "TX",
      niche: "mechanical",
      sales_rep_email: TEST_CLIENT.email,
    },
  },
  {
    id: "WF12",
    label: "Pre-Call Scoring",
    taskId: "wf12-pre-call-scoring",
    payload: {},
  },
  {
    id: "WF13",
    label: "Citation Link Builder",
    taskId: "wf13-citation-link-builder",
    payload: {},
  },
  {
    id: "WF14",
    label: "Competitor Monitoring",
    taskId: "wf14-competitor-monitoring",
    payload: {},
  },
  {
    id: "WF15",
    label: "Geo-Grid Tracker",
    taskId: "wf15-geo-grid-tracker",
    payload: {},
  },
  {
    id: "WF16",
    label: "Review Velocity Tracker",
    taskId: "wf16-review-velocity-tracker",
    payload: {},
  },
  {
    id: "WF17",
    label: "Content Gap Analysis",
    taskId: "wf17-content-gap-analysis",
    payload: {},
  },
  {
    id: "WF18",
    label: "GBP Completeness Audit",
    taskId: "wf18-gbp-completeness-audit",
    payload: {},
  },
  {
    id: "WF19",
    label: "Schema Markup Generator",
    taskId: "wf19-schema-markup-generator",
    payload: {
      client_id: TEST_CLIENT.client_id,
      business_name: TEST_CLIENT.business_name,
      address: "100 Main St, King City, TX 76528",
      phone: "8175559999",
      website: "https://testautoshop.com",
      niche_key: TEST_CLIENT.niche_key,
      services: "Brake Repair, Oil Change, Engine Diagnostics",
    },
  },
  {
    id: "WF20",
    label: "Entity Authority Builder",
    taskId: "wf20-entity-authority-builder",
    payload: {},
  },
  {
    id: "WF21",
    label: "Local Link Builder",
    taskId: "wf21-local-link-builder",
    payload: {},
  },
  {
    id: "WF22",
    label: "AI Search Visibility Audit",
    taskId: "wf22-ai-search-visibility-audit",
    payload: {},
  },
  {
    id: "WF23",
    label: "Full SEO Keyword Research",
    taskId: "wf23-full-seo-keyword-research",
    payload: {
      client_id: TEST_CLIENT.client_id,
      target_city: TEST_CLIENT.city,
      niche_key: TEST_CLIENT.niche_key,
    },
  },
  {
    id: "WF24",
    label: "Automated Content Writer",
    taskId: "wf24-automated-content-writer",
    payload: {},
  },
  {
    id: "WF25",
    label: "Batch Review Request",
    taskId: "wf25-batch-review-request",
    payload: {
      client_id: TEST_CLIENT.client_id,
      customers: [
        { name: "John Smith", phone: "8175551111" },
        { name: "Maria Garcia", phone: "8175552222" },
      ],
    },
  },
  {
    id: "WF25a",
    label: "Daily Owner Reminder",
    taskId: "wf25a-daily-owner-reminder",
    payload: {},
  },
  {
    id: "WF25b",
    label: "Batch Processor",
    taskId: "wf25b-batch-processor",
    payload: {
      client_id: TEST_CLIENT.client_id,
      customers: [
        { name: "Test User A", phone: "8175553333" },
        { name: "Test User B", phone: "8175554444" },
      ],
    },
  },
  {
    id: "WF25c",
    label: "NPS Handler",
    taskId: "wf25c-nps-handler",
    payload: {
      review_request_id: 9999,
      client_id: TEST_CLIENT.client_id,
      customer_name: "Test NPS Customer",
      customer_phone: "8175555555",
      business_name: TEST_CLIENT.business_name,
      service_area: "King City, TX",
      google_review_url: "https://g.page/test-nps",
      niche_key: TEST_CLIENT.niche_key,
      ghl_contact_id: null,
    },
  },
];

// ── Result tracking ─────────────────────────────────────────────────
interface TestResult {
  id: string;
  label: string;
  status: "PASS" | "FAIL" | "SKIP" | "TIMEOUT";
  durationMs: number;
  error?: string;
  runId?: string;
}

// ── Run a single workflow test ──────────────────────────────────────
async function testWorkflow(wf: WorkflowTest): Promise<TestResult> {
  const start = Date.now();

  if (wf.skip) {
    return {
      id: wf.id,
      label: wf.label,
      status: "SKIP",
      durationMs: 0,
      error: wf.skipReason,
    };
  }

  try {
    const handle = await tasks.trigger(wf.taskId, wf.payload);
    const runId = handle.id;

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const run = await runs.retrieve(runId);

      if (run.status === "COMPLETED") {
        return {
          id: wf.id,
          label: wf.label,
          status: "PASS",
          durationMs: Date.now() - start,
          runId,
        };
      }

      if (TERMINAL_STATUSES.includes(run.status) && run.status !== "COMPLETED") {
        const errorMsg =
          run.error
            ? typeof run.error === "object"
              ? JSON.stringify(run.error).slice(0, 200)
              : String(run.error)
            : run.status;
        return {
          id: wf.id,
          label: wf.label,
          status: "FAIL",
          durationMs: Date.now() - start,
          error: errorMsg,
          runId,
        };
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    return {
      id: wf.id,
      label: wf.label,
      status: "TIMEOUT",
      durationMs: Date.now() - start,
      error: "Timed out after 5 minutes",
      runId,
    };
  } catch (err: any) {
    return {
      id: wf.id,
      label: wf.label,
      status: "FAIL",
      durationMs: Date.now() - start,
      error: (err.message || String(err)).slice(0, 200),
    };
  }
}

// ── Format duration ─────────────────────────────────────────────────
function fmtDuration(ms: number): string {
  if (ms === 0) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const total = workflows.length;
  const skipped = workflows.filter((w) => w.skip).length;
  console.log(`\nTesting ${total - skipped} workflows (skipping ${skipped})...\n`);

  const results: TestResult[] = [];

  for (const wf of workflows) {
    process.stdout.write(`${wf.id.padEnd(6)} ${wf.label.padEnd(30)} `);

    const result = await testWorkflow(wf);
    results.push(result);

    const icon =
      result.status === "PASS"
        ? "✅ PASS   "
        : result.status === "SKIP"
          ? "⏭️  SKIP   "
          : result.status === "TIMEOUT"
            ? "⏱️  TIMEOUT"
            : "❌ FAIL   ";

    const duration = fmtDuration(result.durationMs);
    const errorSuffix = result.error ? `  ${result.error}` : "";
    console.log(`${icon}  ${duration}${errorSuffix}`);
  }

  // ── Summary ─────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const timedOut = results.filter((r) => r.status === "TIMEOUT").length;
  const skippedCount = results.filter((r) => r.status === "SKIP").length;

  console.log("\n" + "═".repeat(70));
  console.log("SUMMARY");
  console.log("═".repeat(70));
  console.log(`  PASSED:  ${passed}`);
  console.log(`  FAILED:  ${failed}`);
  console.log(`  TIMEOUT: ${timedOut}`);
  console.log(`  SKIPPED: ${skippedCount} (WF02 — posts to live GMB)`);
  console.log("═".repeat(70));

  if (failed > 0 || timedOut > 0) {
    console.log("\nFailed/Timed-out workflows:");
    for (const r of results) {
      if (r.status === "FAIL" || r.status === "TIMEOUT") {
        console.log(`  ${r.id} (${r.label}): ${r.error || "unknown"}`);
        if (r.runId) console.log(`    Run ID: ${r.runId}`);
      }
    }
  }

  console.log();
  process.exit(failed + timedOut > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
