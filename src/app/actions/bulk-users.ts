"use client";

export type BulkUserCreationResult = {
  created: Array<{ email: string; role: string | null; password: string }>;
  skipped: Array<{ email: string; reason: string }>;
  errors: Array<{ email: string; error: string }>;
};

export type BulkUserPreviewResult = {
  preview: Array<{
    email: string;
    role: string | null;
    status: "ready" | "skipped" | "error";
    reason?: string;
  }>;
  summary: {
    ready: number;
    skipped: number;
    errors: number;
  };
};

async function postBulkUsers<T>(mode: "preview" | "create", content: string): Promise<T> {
  const res = await fetch('/api/admin/bulk-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode, content }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Upload failed');
  }

  return (await res.json()) as T;
}

export async function bulkPreviewUsers(content: string): Promise<BulkUserPreviewResult> {
  return postBulkUsers<BulkUserPreviewResult>("preview", content);
}

export async function bulkCreateUsers(content: string): Promise<BulkUserCreationResult> {
  return postBulkUsers<BulkUserCreationResult>("create", content);
}
