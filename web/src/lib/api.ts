const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type PhotosResponse =
  | { success: true; imageUrl: string }
  | { success: false; message: string };

export async function postPhoto(file: File): Promise<PhotosResponse> {
  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(`${BASE_URL}/photos`, {
    method: "POST",
    body: formData,
  });

  const data: PhotosResponse = await res.json();
  return data;
}
