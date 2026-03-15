import { tasks, runs } from "@trigger.dev/sdk/v3";

async function testWf08() {
  console.log("=== Triggering WF08 Client Health Check ===\n");

  const handle = await tasks.trigger("wf08-client-health-check", {});
  console.log("Triggered run:", handle.id);
  console.log("Polling for completion...\n");

  // Poll until complete
  for (let i = 0; i < 60; i++) {
    const run = await runs.retrieve(handle.id);
    console.log(`[${new Date().toISOString()}] Status: ${run.status}`);

    if (run.status === "COMPLETED") {
      console.log("\n=== WF08 COMPLETED ===");
      console.log("Output:", JSON.stringify(run.output, null, 2));
      return;
    }

    if (run.status === "FAILED" || run.status === "CRASHED" || run.status === "SYSTEM_FAILURE" || run.status === "CANCELED") {
      console.log("\n=== WF08 FAILED ===");
      console.log("Status:", run.status);
      console.log("Error:", JSON.stringify(run.error, null, 2));
      return;
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  console.log("Timed out after 3 minutes");
}

testWf08().catch(console.error);
