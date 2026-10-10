import { api } from "./client";

export async function getTutors(params = {}) {
  const response = await api.get("/tutors/", { params });
  return response.data;
}
