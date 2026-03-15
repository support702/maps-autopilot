import { runs } from "@trigger.dev/sdk";

async function monitorRun() {
  const runId = "run_vzmernozdvksmpndwfd3v";
  let lastStatus = "";
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    try {
      const handle = await runs.retrieve(runId);
      
      if (handle.status !== lastStatus) {
        console.log(`[${new Date().toISOString()}] ${lastStatus || 'INITIAL'} → ${handle.status}`);
        lastStatus = handle.status;
      }

      if (handle.isCompleted) {
        console.log("\n✅ RUN COMPLETED");
        console.log("Status:", handle.status);
        console.log("Success:", handle.isSuccess);
        console.log("Failed:", handle.isFailed);
        console.log("Duration:", handle.durationMs, "ms");
        console.log("Cost:", handle.costInCents / 100, "USD");
        console.log("Attempts:", handle.attemptCount);
        
        if (handle.output) {
          console.log("\nOutput:", JSON.stringify(handle.output, null, 2));
        }
        
        if (handle.error) {
          console.log("\n❌ Error:", JSON.stringify(handle.error, null, 2));
        }
        
        break;
      }

      if (handle.isExecuting && lastStatus !== "EXECUTING") {
        console.log("🚀 EXECUTION STARTED (attempt", handle.attemptCount + ")");
      }

      attempts++;
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    } catch (error) {
      console.error("Error:", error);
      break;
    }
  }

  if (attempts >= maxAttempts) {
    console.log("\n⏱️ Timeout - check dashboard:");
    console.log(`https://cloud.trigger.dev/projects/v3/proj_hbfzjpevxqjdpqoxwxik/runs/${runId}`);
  }
}

monitorRun().catch(console.error);
