import { tasks } from "@trigger.dev/sdk/v3";

async function test() {
  const result = await tasks.trigger("wf02-content-engine", {});
  console.log("Triggered:", result);
}

test().catch(console.error);
