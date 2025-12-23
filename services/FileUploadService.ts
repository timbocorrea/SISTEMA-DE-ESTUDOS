import { createSupabaseClient } from './supabaseClient';

export class FileUploadService {
    private supabase = createSupabaseClient();
    private bucketName = 'lesson-resources';

    /**
     * Faz upload de um arquivo para o Supabase Storage
     * @param file - Arquivo a ser enviado
     * @param folder - Pasta dentro do bucket (ex: 'pdfs', 'images', 'audios')
     * @returns URL pública do arquivo
     */
    async uploadFile(file: File, folder: string = 'general'): Promise<string> {
        try {
            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const fileExtension = file.name.split('.').pop();
            const fileName = `${folder}/${timestamp}-${randomString}.${fileExtension}`;

            // Upload do arquivo
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw new Error(`Erro ao fazer upload: ${error.message}`);
            }

            // Obter URL pública
            const { data: urlData } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    /**
     * Deleta um arquivo do storage
     * @param fileUrl - URL pública do arquivo
     */
    async deleteFile(fileUrl: string): Promise<void> {
        try {
            // Extrair caminho do arquivo da URL
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
        } catch (error) {
            console.error('Delete failed:', error);
            throw error;
        }
    }

    /**
     * Valida tipo de arquivo baseado no tipo de recurso
     */
    validateFileType(file: File, resourceType: string): boolean {
        const mimeType = file.type.toLowerCase();

        switch (resourceType) {
            case 'PDF':
                return mimeType === 'application/pdf';
            case 'IMAGE':
                return mimeType.startsWith('image/');
            case 'AUDIO':
                return mimeType.startsWith('audio/');
            default:
                return true; // Permite qualquer tipo para FILE/LINK
        }
    }

    /**
     * Formata tamanho do arquivo para exibição
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Obtém pasta baseada no tipo de recurso
     */
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
