import { apiUrl } from "../../lib/apiBase";
import { authFetch, getClerkSessionToken } from "../../lib/authFetch";
/**
 * Client-side action for uploading a PDF/image overlay to a project.
 * POSTs multipart form data to POST /api/overlay/upload.
 */
export async function uploadProjectOverlay(
  formData: FormData,
  projectId: number
): Promise<{ success: boolean; overlay?: { id: number; fileUrl: string; coordinates: unknown } }> {
  formData.set("projectId", String(projectId));

  const token = await getClerkSessionToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await authFetch(apiUrl(`/api/overlay/upload`), {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Overlay upload failed (${res.status}): ${text}`);
  }

  return res.json();
}
