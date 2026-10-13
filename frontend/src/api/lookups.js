import { api } from "./client";

export async function getLookups() {
  const response = await api.get("/lookups/");
  return response.data;
}
