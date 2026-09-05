import { useMutation, useQuery } from '@tanstack/react-query';
import { ATTACHMENTS_BUCKET, supabase } from '../lib/supabase';

function safeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
}

/** Sube un archivo al bucket privado y devuelve su ruta */
export function useUploadAttachment() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera los 10 MB.');
      const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
      const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      return path;
    },
  });
}

export function useDeleteAttachment() {
  return useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
      if (error) throw error;
    },
  });
}

/** URL firmada temporal para abrir un comprobante */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery<string | null>({
    queryKey: ['signed-url', path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export async function openAttachment(path: string) {
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  window.open(data.signedUrl, '_blank', 'noopener');
}
