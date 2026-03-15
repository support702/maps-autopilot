import { runs } from "@trigger.dev/sdk/v3";

async function checkRun() {
  const handle = await runs.retrieve("run_escxa4bzfi7v4px8c2hd8");
  console.log("Status:", handle.status);
  console.log("Output:", handle.output);
  console.log("Error:", handle.error);
}

checkRun().catch(console.error);
