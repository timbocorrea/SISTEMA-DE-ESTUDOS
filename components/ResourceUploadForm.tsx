import React, { useState } from 'react';
import { LessonResourceRecord } from '../domain/admin';
import { fileUploadService } from '../services/FileUploadService';

interface ResourceUploadFormProps {
    onSubmit: (data: {
        title: string;
        resourceType: LessonResourceRecord['resource_type'];
        url: string;
    }) => Promise<void>;
    isLoading: boolean;
}

const ResourceUploadForm: React.FC<ResourceUploadFormProps> = ({ onSubmit, isLoading }) => {
    const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
    const [title, setTitle] = useState('');
    const [resourceType, setResourceType] = useState<LessonResourceRecord['resource_type']>('PDF');
    const [url, setUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validar tipo
            if (!fileUploadService.validateFileType(file, resourceType)) {
                setError(`Arquivo inválido para o tipo ${resourceType} selecionado`);
                return;
            }
            setSelectedFile(file);
            setError('');
            // Auto-preencher título com nome do arquivo (sem extensão)
            if (!title) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                setTitle(nameWithoutExt);
            }
        }
    };

    const handleSubmit = async () => {
        setError('');

        if (!title.trim()) {
            setError('Por favor, insira um título');
            return;
        }

        if (uploadMethod === 'file' && !selectedFile) {
            setError('Por favor, selecione um arquivo');
            return;
        }

        if (uploadMethod === 'url' && !url.trim()) {
            setError('Por favor, insira uma URL');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);
            let finalUrl = url.trim();

            // Upload de arquivo
            if (uploadMethod === 'file' && selectedFile) {
                setUploadProgress(30);
                const folder = fileUploadService.getFolderByType(resourceType);
                finalUrl = await fileUploadService.uploadFile(selectedFile, folder);
                setUploadProgress(70);
            }

            // Submeter
            await onSubmit({
                title: title.trim(),
                resourceType,
                url: finalUrl
            });

            setUploadProgress(100);

            // Limpar form
            setTitle('');
            setUrl('');
            setSelectedFile(null);
            setUploadProgress(0);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Toggle: File Upload vs URL */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                    onClick={() => {
                        setUploadMethod('file');
                        setUrl('');
                        setError('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all ${uploadMethod === 'file'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <i className="fas fa-upload mr-1"></i>
                    Upload de Arquivo
                </button>
                <button
                    onClick={() => {
                        setUploadMethod('url');
                        setSelectedFile(null);
                        setError('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all ${uploadMethod === 'url'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <i className="fas fa-link mr-1"></i>
                    Usar URL
                </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título do material"
                    disabled={isLoading || isUploading}
                    className="w-full bg white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 text-sm outline-none disabled:opacity-50"
                />

                <select
                    value={resourceType}
                    onChange={e => {
                        setResourceType(e.target.value as LessonResourceRecord['resource_type']);
                        setSelectedFile(null);
                        setError('');
                    }}
                    disabled={isLoading || isUploading}
                    className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 text-sm outline-none disabled:opacity-50"
                >
                    <option value="PDF">📄 PDF</option>
                    <option value="AUDIO">🎵 Áudio</option>
                    <option value="IMAGE">🖼️ Imagem</option>
                    <option value="LINK">🔗 Link</option>
                    <option value="FILE">📎 Outro Arquivo</option>
                </select>

                {/* Upload de Arquivo */}
                {uploadMethod === 'file' && (
                    <div className="space-y-2">
                        <label className="block">
                            <div className="relative">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    disabled={isLoading || isUploading}
                                    accept={
                                        resourceType === 'PDF' ? '.pdf' :
                                            resourceType === 'IMAGE' ? 'image/*' :
                                                resourceType === 'AUDIO' ? 'audio/*' :
                                                    '*'
                                    }
                                    className="hidden"
                                />
                                <div className="w-full bg-white dark:bg-[#0a0e14] border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 rounded-xl px-4 py-8 text-center cursor-pointer transition-colors">
                                    {selectedFile ? (
                                        <div className="space-y-2">
                                            <i className="fas fa-file-check text-3xl text-green-500"></i>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {fileUploadService.formatFileSize(selectedFile.size)}
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSelectedFile(null);
                                                }}
                                                className="text-xs text-red-500 hover:text-red-700 font-bold"
                                            >
                                                <i className="fas fa-times mr-1"></i>
                                                Remover
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <i className="fas fa-cloud-upload-alt text-4xl text-indigo-500"></i>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                Clique para selecionar arquivo
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {resourceType === 'PDF' && 'PDF até 50MB'}
                                                {resourceType === 'IMAGE' && 'JPG, PNG, WEBP até 10MB'}
                                                {resourceType === 'AUDIO' && 'MP3, WAV até 50MB'}
                                                {!['PDF', 'IMAGE', 'AUDIO'].includes(resourceType) && 'Qualquer arquivo'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </label>
                    </div>
                )}

                {/* URL Input */}
                {uploadMethod === 'url' && (
                    <div className="space-y-1">
                        <input
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder={
                                resourceType === 'PDF' ? 'https://exemplo.com/arquivo.pdf' :
                                    resourceType === 'AUDIO' ? 'https://exemplo.com/audio.mp3' :
                                        resourceType === 'IMAGE' ? 'https://exemplo.com/imagem.jpg' :
                                            resourceType === 'LINK' ? 'https://exemplo.com' :
                                                'https://exemplo.com/arquivo'
                            }
                            disabled={isLoading || isUploading}
                            className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 text-sm outline-none disabled:opacity-50"
                        />
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1">
                            💡 Cole o link direto do arquivo hospedado
                        </p>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {isUploading && uploadProgress > 0 && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-indigo-600">
                        <span>Fazendo upload...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isLoading || isUploading || !title.trim() || (uploadMethod === 'file' && !selectedFile) || (uploadMethod === 'url' && !url.trim())}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                {isUploading ? (
                    <>
                        <i className="fas fa-circle-notch animate-spin"></i>
                        Enviando...
                    </>
                ) : (
                    <>
                        <i className="fas fa-plus"></i>
                        Adicionar Material
                    </>
                )}
            </button>
        </div>
    );
};

export default ResourceUploadForm;
