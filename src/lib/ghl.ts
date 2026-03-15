import axios from "axios";

const GHL_BASE = "https://rest.gohighlevel.com/v1";

const ghlClient = axios.create({
  baseURL: GHL_BASE,
  headers: { Authorization: `Bearer ${process.env.GHL_API_KEY}` },
});

export async function sendSMS(contactId: string, message: string) {
  return ghlClient.post("/conversations/messages", {
    type: "SMS",
    contactId,
    message,
  });
}

export async function getContact(contactId: string) {
  const { data } = await ghlClient.get(`/contacts/${contactId}`);
  return data.contact;
}

export async function createContact(fields: Record<string, unknown>) {
  const { data } = await ghlClient.post("/contacts", fields);
  return data.contact;
}

export async function addTag(contactId: string, tag: string) {
  return ghlClient.post(`/contacts/${contactId}/tags`, { tags: [tag] });
}

export async function removeTag(contactId: string, tag: string) {
  return ghlClient.delete(`/contacts/${contactId}/tags`, {
    data: { tags: [tag] },
  });
}

export async function createTask(
  contactId: string,
  title: string,
  dueDate: string
) {
  return ghlClient.post("/contacts/tasks", {
    contactId,
    title,
    dueDate,
    status: "incomplete",
  });
}
