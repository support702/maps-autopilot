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

interface KieTaskOutput {
  image_url?: string;
  video_url?: string;
  url?: string;
}

interface KieTaskData {
  status?: string;
  error?: string;
  output?: KieTaskOutput;
}

interface KieTaskDetailsResponse {
  code: number;
  msg: string;
  data: KieTaskData;
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

/** Get current status/details of a Kie.ai task. */
export async function getKieTaskStatus(taskId: string): Promise<KieTaskDetailsResponse> {
  const response = await fetch(
    `${KIE_BASE_URL}/jobs/getTaskDetails?taskId=${taskId}`,
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
  options: { maxAttempts: number; intervalMs: number }
): Promise<KieTaskData> {
  for (let i = 0; i < options.maxAttempts; i++) {
    const result = await getKieTaskStatus(taskId);
    const status = result.data?.status;

    if (status === "completed" || status === "success") {
      return result.data;
    }
    if (status === "failed") {
      throw new Error(
        `Kie.ai task ${taskId} failed: ${result.data?.error || "unknown error"}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }

  throw new Error(
    `Kie.ai task ${taskId} timed out after ${options.maxAttempts * options.intervalMs}ms`
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
  const result = await pollKieTask(taskId, { maxAttempts: 24, intervalMs: 5000 });

  const imageUrl = result.output?.image_url || result.output?.url || "";
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

  const videoUrl = result.output?.video_url || result.output?.url || "";
  if (!videoUrl) {
    throw new Error(`Kie.ai task ${taskId} completed but returned no video URL`);
  }

  return { videoUrl, taskId };
}
