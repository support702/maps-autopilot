import axios from "axios";

// === Kie.ai — GPT-Image-1.5 ===
const kieClient = axios.create({
  baseURL: "https://api.kie.ai/api/v1",
  headers: { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}` },
});

export async function generateImage(prompt: string): Promise<string> {
  const { data: createResp } = await kieClient.post("/jobs/createTask", {
    model: "gpt-image/1.5-text-to-image",
    input: { prompt, aspect_ratio: "3:2", quality: "medium" },
  });
  const taskId = createResp.data.taskId;

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const { data: pollResp } = await kieClient.get(
      `/jobs/recordInfo?taskId=${taskId}`
    );
    if (pollResp.data.state?.includes("success")) {
      return JSON.parse(pollResp.data.resultJson).resultUrls[0];
    }
    if (pollResp.data.state?.includes("fail")) {
      throw new Error(`Kie.ai task failed: ${pollResp.data.state}`);
    }
  }
  throw new Error("Kie.ai image generation timed out after 5 minutes");
}

// === Bannerbear — text overlay on images ===
const bbClient = axios.create({
  baseURL: "https://api.bannerbear.com/v2",
  headers: { Authorization: `Bearer ${process.env.BANNERBEAR_API_KEY}` },
});

export async function overlayText(
  backgroundImageUrl: string,
  headline: string,
  businessName: string
): Promise<string> {
  const { data } = await bbClient.post("/images", {
    template: process.env.BANNERBEAR_TEMPLATE_ID || "YJBpekZX8BPrZ2XPnO",
    modifications: [
      { name: "background_image", image_url: backgroundImageUrl },
      { name: "Headline", text: headline },
      { name: "business_name", text: businessName },
    ],
  });

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const { data: poll } = await bbClient.get(`/images/${data.uid}`);
    if (poll.status === "completed" && poll.image_url) {
      return poll.image_url;
    }
  }
  throw new Error("Bannerbear image timed out after 20 attempts");
}
