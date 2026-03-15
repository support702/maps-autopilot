import { runs } from "@trigger.dev/sdk/v3";

async function monitorRun() {
  const runId = "run_escxa4bzfi7v4px8c2hd8";
  let lastStatus = "";
  let attempts = 0;
  const maxAttempts = 20; // 10 minutes max (20 * 30s)

  while (attempts < maxAttempts) {
    try {
      const handle = await runs.retrieve(runId);
      
      if (handle.status !== lastStatus) {
        console.log(`[${new Date().toISOString()}] Status changed: ${lastStatus || 'INITIAL'} → ${handle.status}`);
        lastStatus = handle.status;
      }

      // Check for completion states
      if (handle.isCompleted) {
        console.log("\n✅ RUN COMPLETED");
        console.log("Status:", handle.status);
        console.log("Success:", handle.isSuccess);
        console.log("Failed:", handle.isFailed);
        console.log("Duration:", handle.durationMs, "ms");
        console.log("Cost:", handle.costInCents, "cents");
        console.log("Attempts:", handle.attemptCount);
        
        if (handle.output) {
          console.log("\nOutput:", JSON.stringify(handle.output, null, 2));
        }
        
        if (handle.error) {
          console.log("\n❌ Error:", JSON.stringify(handle.error, null, 2));
        }
        
        break;
      }

      // Check for execution start
      if (handle.isExecuting && lastStatus !== "EXECUTING") {
        console.log("\n🚀 EXECUTION STARTED");
        console.log("Attempt:", handle.attemptCount);
      }

      attempts++;
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error checking run:`, error);
      break;
    }
  }

  if (attempts >= maxAttempts) {
    console.log("\n⏱️ Monitoring timeout reached (10 minutes)");
    console.log("Run may still be queued. Check dashboard:");
    console.log(`https://cloud.trigger.dev/projects/v3/proj_hbfzjpevxqjdpqoxwxik/runs/${runId}`);
  }
}

monitorRun().catch(console.error);
