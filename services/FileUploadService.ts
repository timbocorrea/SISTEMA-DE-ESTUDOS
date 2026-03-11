import { createSupabaseClient } from './supabaseClient';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES: Record<string, readonly string[]> = {
    PDF: ['application/pdf'],
    IMAGE: [
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
    ],
    AUDIO: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/m4a',
        'audio/x-m4a',
        'audio/mp4',
        'audio/webm',
        'audio/flac',
    ],
    FILE: [
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
} as const;

const ALLOWED_EXTENSIONS: Record<string, readonly string[]> = {
    PDF: ['pdf'],
    IMAGE: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
    AUDIO: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm', 'flac'],
    FILE: ['pdf', 'txt', 'csv', 'docx', 'xlsx', 'pptx'],
} as const;

export class FileUploadService {
    private supabase = createSupabaseClient();
    private bucketName = 'lesson-resources';

    async uploadFile(file: File, folder: string = 'general'): Promise<string> {
        let maxAllowedSize = 10 * 1024 * 1024; // Default 10MB
        if (folder === 'audios') {
            maxAllowedSize = 50 * 1024 * 1024; // 50MB for Audio
        }

        if (file.size > maxAllowedSize) {
            throw new Error(`Arquivo excede o tamanho máximo de ${maxAllowedSize / 1024 / 1024}MB.`);
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        if (!fileExtension) {
            throw new Error('Arquivo sem extensão válida.');
        }

        const fileName = `${folder}/${timestamp}-${randomString}.${fileExtension}`;

        const { error } = await this.supabase.storage
            .from(this.bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw new Error(`Erro ao fazer upload: ${error.message}`);
        }

        const { data: urlData } = this.supabase.storage
            .from(this.bucketName)
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    }

    async deleteFile(fileUrl: string): Promise<void> {
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split(`/${this.bucketName}/`);
        if (pathParts.length < 2) {
            throw new Error('URL inválida');
        }

        const filePath = pathParts[1];

        const { error } = await this.supabase.storage
            .from(this.bucketName)
            .remove([filePath]);

        if (error) {
            throw new Error(`Erro ao deletar arquivo: ${error.message}`);
        }
    }

    /**
     * Validates file type against a strict MIME + extension whitelist.
     * Cross-validates MIME type against file extension to catch spoofing.
     */
    validateFileType(file: File, resourceType: string): boolean {
        const mimeType = file.type.toLowerCase();
        const extension = file.name.split('.').pop()?.toLowerCase() || '';

        const allowedMimes = ALLOWED_MIME_TYPES[resourceType];
        const allowedExts = ALLOWED_EXTENSIONS[resourceType];

        if (!allowedMimes || !allowedExts) {
            return false;
        }

        const mimeValid = allowedMimes.includes(mimeType);
        const extValid = allowedExts.includes(extension);

        return mimeValid && extValid;
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getFolderByType(resourceType: string): string {
        switch (resourceType) {
            case 'PDF':
                return 'pdfs';
            case 'IMAGE':
                return 'images';
            case 'AUDIO':
                return 'audios';
            default:
                return 'files';
        }
    }
}

export const fileUploadService = new FileUploadService();
