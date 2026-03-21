// src/trigger/wf-adengine/kie-api-client.ts
// Kie.ai API client for the WF-ADENGINE ad production engine.
// Provides image generation (Nano Banana Pro) and video generation (Kling 3.0) helpers.
// Used by Phase 2 (anchor), Phase 3 (scene frames), and Phase 4 (video clips).

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

interface KieCreateTaskParams {
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
}

interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

interface KieTaskData {
  state?: string;
  resultJson?: string;
  error?: string;
}

interface KieTaskDetailsResponse {
  code: number;
  msg: string;
  data: KieTaskData;
}

interface KieParsedResult {
  state?: string;
  resultUrls?: string[];
  error?: string;
}

/** Create a task on Kie.ai. Returns the taskId for polling. */
export async function createKieTask(params: KieCreateTaskParams): Promise<string> {
  const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      input: params.input,
      callBackUrl: params.callBackUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Kie.ai HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as KieCreateTaskResponse;
  if (data.code !== 200) {
    throw new Error(`Kie.ai create task error: ${data.msg}`);
  }
  return data.data.taskId;
}

/** Get current status/details of a Kie.ai task via /jobs/recordInfo endpoint. */
export async function getKieTaskStatus(taskId: string): Promise<KieTaskDetailsResponse> {
  const response = await fetch(
    `${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
    {
      headers: { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Kie.ai HTTP error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as KieTaskDetailsResponse;
}

/**
 * Poll a Kie.ai task until it completes or fails.
 * Throws on failure or timeout.
 */
export async function pollKieTask(
  taskId: string,
  options: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<KieParsedResult> {
  const maxAttempts = options.maxAttempts ?? 60;
  const intervalMs = options.intervalMs ?? 10000;

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getKieTaskStatus(taskId);
    const state = status.data?.state || "";

    console.log(`Polling Kie.ai task ${taskId} — attempt ${i+1}/${maxAttempts} — status: ${status.data?.state || 'unknown'}`);

    if (state.includes("success")) {
      const parsed: KieParsedResult = { state };
      if (status.data?.resultJson) {
        try {
          const resultData = JSON.parse(result.data.resultJson);
          parsed.resultUrls = resultData.resultUrls;
        } catch {
          // resultJson wasn't valid JSON, leave resultUrls empty
        }
      }
      return parsed;
    }
    if (state.includes("fail")) {
      throw new Error(
        `Kie.ai task ${taskId} failed: ${status.data?.error || state}`
      );
    }

    // In-progress states: waiting, queuing, generating — keep polling
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Kie.ai task ${taskId} timed out after ${maxAttempts * intervalMs}ms`
  );
}

/**
 * Generate an image using Nano Banana Pro model.
 * Supports optional reference images for style consistency.
 */
export async function generateImage(params: {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: string;
  resolution?: string;
}): Promise<{ imageUrl: string; taskId: string }> {
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio || "16:9",
    resolution: params.resolution || "4K",
    output_format: "png",
  };

  if (params.referenceImages && params.referenceImages.length > 0) {
    input.image_input = params.referenceImages;
  }

  const taskId = await createKieTask({ model: "nano-banana-pro", input });
  const result = await pollKieTask(taskId, { maxAttempts: 60, intervalMs: 5000 });

  const imageUrl = result.resultUrls?.[0] || "";
  if (!imageUrl) {
    throw new Error(`Kie.ai task ${taskId} completed but returned no image URL`);
  }

  return { imageUrl, taskId };
}

/**
 * Generate a video clip using Kling 3.0 model.
 * Requires a start frame image; end frame is optional.
 */
export async function generateVideo(params: {
  prompt: string;
  startFrameUrl: string;
  endFrameUrl?: string;
  duration?: string;
  aspectRatio?: string;
  mode?: string;
}): Promise<{ videoUrl: string; taskId: string }> {
  const imageUrls = [params.startFrameUrl];
  if (params.endFrameUrl) {
    imageUrls.push(params.endFrameUrl);
  }

  const taskId = await createKieTask({
    model: "kling-3.0/video",
    input: {
      prompt: params.prompt,
      image_urls: imageUrls,
      duration: params.duration || "5",
      aspect_ratio: params.aspectRatio || "16:9",
      mode: params.mode || "pro",
      sound: false,
      multi_shots: false,
    },
  });

  const result = await pollKieTask(taskId, { maxAttempts: 60, intervalMs: 10000 });

  const videoUrl = result.resultUrls?.[0] || "";
  if (!videoUrl) {
    throw new Error(`Kie.ai task ${taskId} completed but returned no video URL`);
  }

  return { videoUrl, taskId };
}
