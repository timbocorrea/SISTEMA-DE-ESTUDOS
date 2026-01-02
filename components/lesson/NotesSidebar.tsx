import React from 'react';
import NotesPanelPrototype from '../NotesPanelPrototype';

interface NotesSidebarProps {
    lessonId: string;
    userId: string;
    focusedNoteId: string | null;
    onHighlightClick?: (noteId: string) => void;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({
    lessonId,
    userId,
    focusedNoteId,
    onHighlightClick
}) => {
    return (
        <div className="notes-sidebar h-full">
            <NotesPanelPrototype
                lessonId={lessonId}
                userId={userId}
                focusedNoteId={focusedNoteId}
            />
        </div>
    );
};

export default NotesSidebar;
