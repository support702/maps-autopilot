import { runs } from "@trigger.dev/sdk/v3";

async function checkRun() {
  const handle = await runs.retrieve("run_escxa4bzfi7v4px8c2hd8");
  console.log("Full run details:", JSON.stringify(handle, null, 2));
}

checkRun().catch(console.error);
