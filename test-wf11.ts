import { tasks, runs } from "@trigger.dev/sdk/v3";

async function testWf11() {
  console.log("=== Triggering WF11 Sales Quick Audit ===\n");

  const handle = await tasks.trigger("wf11-sales-quick-audit", {
    business_name: "King City Automotive",
    city: "King City",
    niche: "mechanical",
    sales_rep_email: "tom@haildentpro.com",
  });

  console.log("Triggered run:", handle.id);
  console.log("Polling for completion...\n");

  for (let i = 0; i < 60; i++) {
    const run = await runs.retrieve(handle.id);
    console.log(`[${new Date().toISOString()}] Status: ${run.status}`);

    if (run.status === "COMPLETED") {
      console.log("\n=== WF11 COMPLETED ===");
      console.log("Output:", JSON.stringify(run.output, null, 2));
      return;
    }

    if (
      run.status === "FAILED" ||
      run.status === "CRASHED" ||
      run.status === "SYSTEM_FAILURE" ||
      run.status === "CANCELED"
    ) {
      console.log("\n=== WF11 FAILED ===");
      console.log("Status:", run.status);
      console.log("Error:", JSON.stringify(run.error, null, 2));
      return;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log("Timed out after 5 minutes");
}

testWf11().catch(console.error);
