import crypto from "crypto";
import axios from "axios";

const API_KEY = process.env.BRIGHTLOCAL_API_KEY || "";
const API_SECRET = process.env.BRIGHTLOCAL_API_SECRET || "";

function generateAuth(): { sig: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + 1800;
  const sig = crypto
    .createHmac("sha1", API_SECRET)
    .update(API_KEY + expires)
    .digest("hex");
  return { sig, expires };
}

const blClient = axios.create({
  baseURL: "https://tools.brightlocal.com/seo-tools/api/v4",
});

export async function fetchReviews(
  locationId: string,
  startDate?: string
) {
  const { sig, expires } = generateAuth();
  const { data } = await blClient.get("/reviews", {
    params: {
      "api-key": API_KEY,
      sig,
      expires,
      "location-id": locationId,
      "start-date": startDate,
    },
  });
  return data;
}

export async function checkCitations(locationId: string) {
  const { sig, expires } = generateAuth();
  const { data } = await blClient.get("/citations", {
    params: {
      "api-key": API_KEY,
      sig,
      expires,
      "location-id": locationId,
    },
  });
  return data;
}
