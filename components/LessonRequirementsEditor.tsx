import React, { useState, useEffect } from 'react';
import { Lesson, LessonResource } from '../domain/entities';
import { LessonProgressRequirements } from '../domain/lesson-requirements';

interface Props {
    lesson: Lesson;
    requirements: LessonProgressRequirements;
    onSave: (requirements: LessonProgressRequirements) => Promise<void>;
    onClose: () => void;
}

export const LessonRequirementsEditor: React.FC<Props> = ({
    lesson,
    requirements,
    onSave,
    onClose
}) => {
    const [videoPercent, setVideoPercent] = useState(requirements.videoRequiredPercent);
    const [textPercent, setTextPercent] = useState(requirements.textBlocksRequiredPercent);
    const [requiredPdfs, setRequiredPdfs] = useState<Set<string>>(
        new Set(requirements.requiredPdfs)
    );
    const [isSaving, setIsSaving] = useState(false);

    // Safe access to resources
    const resources = lesson.resources || [];
    const pdfsAndFiles = resources.filter((r: LessonResource) => r.type === 'PDF' || r.type === 'FILE');
    const hasRequirements = videoPercent > 0 || textPercent > 0 || requiredPdfs.size > 0;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newRequirements = new LessonProgressRequirements(
                lesson.id,
                videoPercent,
                textPercent,
                Array.from(requiredPdfs),
                [], // audios - futuro
                [] // materials - futuro
            );
            await onSave(newRequirements);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar requisitos:', error);
            alert('Erro ao salvar requisitos. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-sliders-h text-indigo-600"></i>
                                Requisitos para Quiz
                            </h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Configure o que o aluno deve completar
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                        >
                            <i className="fas fa-times text-slate-400 text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Vídeo Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-900 dark:text-white">
                                📹 Vídeo
                            </label>
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                {videoPercent}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={videoPercent}
                            onChange={(e) => setVideoPercent(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            style={{
                                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${videoPercent}%, #e2e8f0 ${videoPercent}%, #e2e8f0 100%)`
                            }}
                        />
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            {videoPercent === 0
                                ? '⚠️ Vídeo não obrigatório'
                                : `Aluno deve assistir ${videoPercent}% do vídeo`}
                        </p>
                    </div>

                    {/* Blocos de Texto Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-900 dark:text-white">
                                📝 Blocos de Texto
                            </label>
                            <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                                {textPercent}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={textPercent}
                            onChange={(e) => setTextPercent(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            style={{
                                background: `linear-gradient(to right, #9333ea 0%, #9333ea ${textPercent}%, #e2e8f0 ${textPercent}%, #e2e8f0 100%)`
                            }}
                        />
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            {textPercent === 0
                                ? '⚠️ Leitura não obrigatória'
                                : `Aluno deve ler ${textPercent}% dos blocos`}
                        </p>
                    </div>

                    {/* Materiais Obrigatórios */}
                    {pdfsAndFiles.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-900 dark:text-white block">
                                📄 Materiais Obrigatórios
                            </label>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {pdfsAndFiles.map((resource: LessonResource) => (
                                    <label
                                        key={resource.id}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={requiredPdfs.has(resource.id)}
                                            onChange={(e) => {
                                                const newSet = new Set(requiredPdfs);
                                                if (e.target.checked) {
                                                    newSet.add(resource.id);
                                                } else {
                                                    newSet.delete(resource.id);
                                                }
                                                setRequiredPdfs(newSet);
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                                {resource.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                {resource.type}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400">
                                {requiredPdfs.size === 0
                                    ? '⚠️ Nenhum material obrigatório'
                                    : `${requiredPdfs.size} material(is) obrigatório(s)`}
                            </p>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                            <i className="fas fa-eye text-[10px]"></i>
                            Preview para o Aluno
                        </h4>
                        {hasRequirements ? (
                            <ul className="space-y-1">
                                {videoPercent > 0 && (
                                    <li className="text-[10px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                        <span>Assistir <strong>{videoPercent}%</strong> do vídeo</span>
                                    </li>
                                )}
                                {textPercent > 0 && (
                                    <li className="text-[10px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                        <span>Ler <strong>{textPercent}%</strong> dos blocos</span>
                                    </li>
                                )}
                                {requiredPdfs.size > 0 && (
                                    <li className="text-[10px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                        <span>Visualizar <strong>{requiredPdfs.size}</strong> material(is)</span>
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                ⚠️ Sem requisitos. Quiz sempre disponível.
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg font-semibold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <i className="fas fa-circle-notch fa-spin text-xs"></i>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save text-xs"></i>
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
