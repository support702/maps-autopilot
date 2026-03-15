import axios from "axios";

export async function queryPerplexity(prompt: string): Promise<string> {
  const { data } = await axios.post(
    "https://api.perplexity.ai/chat/completions",
    {
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
    }
  );
  return data.choices[0].message.content;
}
