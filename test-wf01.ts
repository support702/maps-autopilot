import { tasks, runs } from "@trigger.dev/sdk/v3";

async function testWf01() {
  console.log("=== Triggering WF01 Client Onboarding ===\n");

  const handle = await tasks.trigger("wf01-client-onboarding", {
    business_name: "Test Plumber Shop",
    business_phone: "5125551234",
    business_address: "456 Oak St, Austin, TX 78701",
    business_website: "https://testplumber.com",
    primary_services: "Drain Cleaning, Water Heater Repair, Pipe Repair",
    service_area: "Austin, TX",
    niche_key: "mechanical",
    years_in_business: 8,
    unique_selling_points: "24/7 Emergency Service, Licensed and Insured",
    google_review_url: "https://g.page/test",
    contact_id: "test-contact-123",
  });

  console.log("Triggered run:", handle.id);
  console.log("Polling for completion (up to 5 min)...\n");

  for (let i = 0; i < 60; i++) {
    const run = await runs.retrieve(handle.id);
    console.log(`[${new Date().toISOString()}] Status: ${run.status}`);

    if (run.status === "COMPLETED") {
      console.log("\n=== WF01 COMPLETED ===");
      console.log("Output:", JSON.stringify(run.output, null, 2));
      return;
    }

    if (
      run.status === "FAILED" ||
      run.status === "CRASHED" ||
      run.status === "SYSTEM_FAILURE" ||
      run.status === "CANCELED"
    ) {
      console.log("\n=== WF01 FAILED ===");
      console.log("Status:", run.status);
      console.log("Error:", JSON.stringify(run.error, null, 2));
      return;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log("Timed out after 5 minutes");
}

testWf01().catch(console.error);
