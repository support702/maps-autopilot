import "dotenv/config";
import { tasks, runs } from "@trigger.dev/sdk/v3";

const TEST_CLIENT = {
  client_id: "client-1772735253089",
  business_name: "King City Automotive",
  late_account_id: "69a89ef7dc8cab9432b88ab1",
  niche_key: "mechanical",
  city: "King City",
  email: "tom@haildentpro.com",
};

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CRASHED", "SYSTEM_FAILURE", "CANCELED"];

interface WorkflowTest {
  id: string;
  label: string;
  taskId: string;
  payload: Record<string, unknown>;
  timeoutMs: number;
}

const workflows: WorkflowTest[] = [
  {
    id: "WF04",
    label: "Review Request NPS",
    taskId: "wf04-review-request-nps",
    timeoutMs: 120_000,
    payload: {
      client_id: TEST_CLIENT.client_id,
      customer_name: "Test Customer",
      customer_phone: "8175550001",
    },
  },
  {
    id: "WF06",
    label: "Photo Upload Handler",
    taskId: "wf06-photo-upload-handler",
    timeoutMs: 120_000,
    payload: {
      client_id: TEST_CLIENT.client_id,
      photo_urls: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
      captions: ["Shop front", "Service bay"],
    },
  },
  {
    id: "WF14",
    label: "Competitor Monitoring",
    taskId: "wf14-competitor-monitoring",
    timeoutMs: 180_000,
    payload: {},
  },
  {
    id: "WF15",
    label: "Geo-Grid Tracker",
    taskId: "wf15-geo-grid-tracker",
    timeoutMs: 180_000,
    payload: {},
  },
  {
    id: "WF25",
    label: "Batch Review Request",
    taskId: "wf25-batch-review-webhook",
    timeoutMs: 60_000,
    payload: {
      client_id: TEST_CLIENT.client_id,
      customers: [
        { name: "John Smith", phone: "8175551111" },
        { name: "Maria Garcia", phone: "8175552222" },
      ],
    },
  },
  {
    id: "WF25b",
    label: "Batch Processor",
    taskId: "wf25b-batch-processor",
    timeoutMs: 120_000,
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
    timeoutMs: 120_000,
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

interface TestResult {
  id: string;
  label: string;
  status: "PASS" | "FAIL" | "TIMEOUT";
  durationMs: number;
  error?: string;
  runId?: string;
}

async function testWorkflow(wf: WorkflowTest): Promise<TestResult> {
  const start = Date.now();
  const maxPolls = Math.ceil(wf.timeoutMs / POLL_INTERVAL_MS);

  try {
    const handle = await tasks.trigger(wf.taskId, wf.payload);
    const runId = handle.id;

    for (let i = 0; i < maxPolls; i++) {
      const run = await runs.retrieve(runId);

      if (run.status === "COMPLETED") {
        return { id: wf.id, label: wf.label, status: "PASS", durationMs: Date.now() - start, runId };
      }

      if (TERMINAL_STATUSES.includes(run.status) && run.status !== "COMPLETED") {
        const errorMsg = run.error
          ? typeof run.error === "object" ? JSON.stringify(run.error).slice(0, 300) : String(run.error)
          : run.status;
        return { id: wf.id, label: wf.label, status: "FAIL", durationMs: Date.now() - start, error: errorMsg, runId };
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    return { id: wf.id, label: wf.label, status: "TIMEOUT", durationMs: Date.now() - start, error: `Timed out after ${wf.timeoutMs / 1000}s`, runId };
  } catch (err: any) {
    return { id: wf.id, label: wf.label, status: "FAIL", durationMs: Date.now() - start, error: (err.message || String(err)).slice(0, 300) };
  }
}

function fmtDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

async function main() {
  console.log(`\n🔄 Re-testing ${workflows.length} previously failed workflows after DB schema fixes...\n`);

  const results: TestResult[] = [];

  for (const wf of workflows) {
    process.stdout.write(`${wf.id.padEnd(6)} ${wf.label.padEnd(28)} `);
    const result = await testWorkflow(wf);
    results.push(result);

    const icon = result.status === "PASS" ? "✅ PASS   " : result.status === "TIMEOUT" ? "⏱️  TIMEOUT" : "❌ FAIL   ";
    const errSuffix = result.status !== "PASS" && result.error ? `  ${result.error}` : "";
    console.log(`${icon}  ${fmtDuration(result.durationMs)}${errSuffix}`);
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status !== "PASS").length;

  console.log("\n" + "═".repeat(70));
  if (failed === 0) {
    console.log(`All ${passed} workflows PASSED`);
  } else {
    console.log(`${passed}/${results.length} passed, ${failed} failed`);
    console.log("\nFailed workflows:");
    for (const r of results.filter((r) => r.status !== "PASS")) {
      console.log(`  ${r.id}: ${r.error || r.status}`);
      if (r.runId) console.log(`    Run ID: ${r.runId}`);
    }
  }
  console.log("═".repeat(70) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(2); });
