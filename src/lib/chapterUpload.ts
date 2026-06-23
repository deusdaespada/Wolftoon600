import { supabase } from '@/integrations/supabase/client';

export interface UploadedImageResult {
  order: number;
  sourceName: string;
  url: string;
}

const IMAGE_FILE_PATTERN = /\.(jpg|jpeg|png|gif|webp|avif)$/i;

export const isSupportedImageFile = (filename: string) => IMAGE_FILE_PATTERN.test(filename);

export const extractSortableNumber = (value: string) => {
  const matches = value.match(/(\d+\.?\d*)/g);
  if (!matches?.length) return 0;

  const lastMatch = matches[matches.length - 1];
  const parsed = Number.parseFloat(lastMatch);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getImageContentType = (filename: string): string => {
  const extension = filename.toLowerCase().split('.').pop();

  const contentTypes: Record<string, string> = {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return contentTypes[extension || ''] || 'image/jpeg';
};

const waitForNextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

const createStorageFileName = (filename: string, index: number) => {
  const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const safeBase = filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `${Date.now()}-${index}-${crypto.randomUUID()}-${safeBase || 'page'}.${extension}`;
};

export const uploadImagesToChapterBucket = async (
  files: File[],
  options?: {
    batchSize?: number;
    onProgress?: (progress: number) => void;
  },
) => {
  const sortedFiles = [...files]
    .filter((file) => isSupportedImageFile(file.name))
    .sort((left, right) => extractSortableNumber(left.name) - extractSortableNumber(right.name));

  const totalFiles = sortedFiles.length;
  const batchSize = Math.max(1, options?.batchSize ?? 6);
  const uploadedResults: UploadedImageResult[] = new Array(totalFiles);
  let uploadedCount = 0;

  for (let batchStart = 0; batchStart < totalFiles; batchStart += batchSize) {
    const currentBatch = sortedFiles.slice(batchStart, batchStart + batchSize);

    await Promise.all(
      currentBatch.map(async (file, batchIndex) => {
        const index = batchStart + batchIndex;
        const fileName = createStorageFileName(file.name, index);
        const contentType = getImageContentType(file.name);

        const { error: uploadError } = await supabase.storage.from('chapters').upload(fileName, file, {
          cacheControl: '3600',
          contentType,
        });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('chapters').getPublicUrl(fileName);

        uploadedResults[index] = {
          order: extractSortableNumber(file.name),
          sourceName: file.name,
          url: publicUrl,
        };

        uploadedCount += 1;
        options?.onProgress?.(Math.round((uploadedCount / totalFiles) * 100));
      }),
    );

    await waitForNextFrame();
  }

  return uploadedResults.filter(Boolean);
};
