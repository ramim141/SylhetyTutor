import { ACCEPT_ATTRIBUTE, MAX_IMAGE_BYTES, imageFileProblem } from "./imageFile";

const file = (type, size = 1000) => ({ type, size });

describe("imageFileProblem", () => {
  it("accepts JPEG, PNG and WebP up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(imageFileProblem(file(type))).toBeNull();
    }
    expect(imageFileProblem(file("image/jpeg", MAX_IMAGE_BYTES))).toBeNull();
  });

  it("refuses a file over 5 MB", () => {
    expect(imageFileProblem(file("image/jpeg", MAX_IMAGE_BYTES + 1))).toBe("file_too_large");
  });

  it("refuses other types, including GIF, PDF and SVG", () => {
    for (const type of ["image/gif", "application/pdf", "image/svg+xml", "text/plain", ""]) {
      expect(imageFileProblem(file(type))).toBe("unsupported_format");
    }
  });

  it("asks for a file when there is none", () => {
    expect(imageFileProblem(undefined)).toBe("required");
  });

  it("offers the same types to the file picker", () => {
    expect(ACCEPT_ATTRIBUTE).toBe("image/jpeg,image/png,image/webp");
  });
});
