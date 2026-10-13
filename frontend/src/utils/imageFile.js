// A quick check before upload so the user hears about a wrong file at once. It is only a
// courtesy: the server decodes the image and is the one that decides.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

/** An error code from the API's file errors (error.file.<code>), or null when it looks fine. */
export function imageFileProblem(file) {
  if (!file) return "required";
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "unsupported_format";
  if (file.size > MAX_IMAGE_BYTES) return "file_too_large";
  return null;
}
