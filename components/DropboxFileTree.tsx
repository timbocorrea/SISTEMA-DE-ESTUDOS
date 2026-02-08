import React, { useState, useEffect } from 'react';
import { DropboxService, DropboxItem } from '../services/dropbox/DropboxService';

interface FileTreeNodeProps {
    item: DropboxItem;
    level: number;
    selectedPath: string;
    onSelectFolder: (path: string) => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ item, level, selectedPath, onSelectFolder }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [children, setChildren] = useState<DropboxItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const isFolder = item.tag === 'folder';
    const isSelected = (item.path_lower || item.id) === selectedPath;

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isFolder) return;

        if (!isExpanded && !hasLoaded) {
            setIsLoading(true);
            try {
                const result = await DropboxService.listFolder(item.path_lower || '');
                // Sort: folders first, then files
                result.sort((a, b) => {
                    if (a.tag === b.tag) return a.name.localeCompare(b.name);
                    return a.tag === 'folder' ? -1 : 1;
                });
                setChildren(result);
                setHasLoaded(true);
                setIsExpanded(true);
            } catch (error) {
                console.error('Error loading folder:', error);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsExpanded(!isExpanded);
        }
    };

    const handleSelect = () => {
        if (isFolder) {
            onSelectFolder(item.path_lower || item.id);
        }
    };

    return (
        <div>
            <div
                className={`flex items-center py-1 px-2 cursor-pointer transition-colors ${isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleSelect}
            >
                {/* Expand Toggle */}
                {isFolder ? (
                    <button
                        onClick={handleToggle}
                        className="w-4 h-4 mr-1 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        {isLoading ? (
                            <i className="fas fa-spinner fa-spin text-xs"></i>
                        ) : (
                            <i className={`fas fa-caret-${isExpanded ? 'down' : 'right'}`}></i>
                        )}
                    </button>
                ) : (
                    <span className="w-4 h-4 mr-1"></span>
                )}

                {/* Icon */}
                <i className={`${isFolder ? 'fas fa-folder text-yellow-500' : 'fas fa-file-audio text-slate-400'} mr-2 text-sm`}></i>

                {/* Name */}
                <span className="text-sm truncate select-none">{item.name}</span>
            </div>

            {/* Children */}
            {isFolder && isExpanded && (
                <div>
                    {children.length > 0 ? (
                        children.map(child => (
                            <FileTreeNode
                                key={child.id}
                                item={child}
                                level={level + 1}
                                selectedPath={selectedPath}
                                onSelectFolder={onSelectFolder}
                            />
                        ))
                    ) : hasLoaded ? (
                        <div
                            className="text-xs text-slate-400 py-1 pl-4 italic"
                            style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}
                        >
                            Vazio
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

interface DropboxFileTreeProps {
    onSelectFolder: (path: string) => void;
    currentPath: string;
}

export const DropboxFileTree: React.FC<DropboxFileTreeProps> = ({ onSelectFolder, currentPath }) => {
    const [rootItems, setRootItems] = useState<DropboxItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoot();
    }, []);

    const loadRoot = async () => {
        setLoading(true);
        try {
            const result = await DropboxService.listFolder('');
            // Sort: folders first, then files
            result.sort((a, b) => {
                if (a.tag === b.tag) return a.name.localeCompare(b.name);
                return a.tag === 'folder' ? -1 : 1;
            });
            setRootItems(result);
        } catch (error) {
            console.error('Error loading root:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <i className="fas fa-spinner fa-spin text-indigo-500 text-2xl"></i>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto overflow-x-hidden pb-4">
            {/* Root "Home" Item representing / */}
            <div
                className={`flex items-center py-1 px-2 cursor-pointer transition-colors mb-1 ${currentPath === '' || currentPath === '/'
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                onClick={() => onSelectFolder('')}
            >
                <i className="fas fa-home mr-2 text-sm text-indigo-500"></i>
                <span className="text-sm">Início</span>
            </div>

            {rootItems.map(item => (
                <FileTreeNode
                    key={item.id}
                    item={item}
                    level={0}
                    selectedPath={currentPath}
                    onSelectFolder={onSelectFolder}
                />
            ))}
        </div>
    );
};
