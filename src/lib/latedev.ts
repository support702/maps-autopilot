import axios from "axios";

const lateClient = axios.create({
  baseURL: "https://getlate.dev/api/v1",
  headers: { Authorization: `Bearer ${process.env.LATE_DEV_API_KEY}` },
});

export async function publishGBPPost(
  accountId: string,
  content: string,
  imageUrl?: string
): Promise<{ postId: string }> {
  const body: Record<string, unknown> = {
    content,
    platforms: [{ platform: "googlebusiness", accountId }],
    publishNow: true,
  };
  if (imageUrl) {
    body.mediaItems = [{ type: "image", url: imageUrl }];
  }
  const { data } = await lateClient.post("/posts", body);
  return {
    postId: data.post?.platforms?.[0]?.platformPostId || "",
  };
}
