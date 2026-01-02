import React, { useEffect } from 'react';
import { Lesson } from '../../domain/entities';
import VideoPlayer from '../VideoPlayer';
import { useLessonStore } from '../../stores/useLessonStore';

interface VideoPlayerWidgetProps {
    lesson: Lesson;
    onProgressUpdate: (watchedSeconds: number, lastBlockId?: string) => Promise<void>;
    onTrackAction?: (action: string) => void;
}

const VideoPlayerWidget: React.FC<VideoPlayerWidgetProps> = ({
    lesson,
    onProgressUpdate,
    onTrackAction
}) => {
    const { setCurrentTime, setIsPlaying } = useLessonStore();

    const handleVideoProgress = async (watchedSeconds: number) => {
        setCurrentTime(watchedSeconds);
        await onProgressUpdate(watchedSeconds);
    };

    const handleVideoPlay = () => {
        setIsPlaying(true);
        onTrackAction?.('Reproduziu vídeo da aula');
    };

    const handleVideoPause = () => {
        setIsPlaying(false);
    };

    return (
        <div className="video-player-container">
            {lesson.videoUrl && (
                <VideoPlayer
                    lesson={lesson}
                    videoUrl={lesson.videoUrl}
                    onProgress={handleVideoProgress}
                    onPlay={handleVideoPlay}
                />
            )}
        </div>
    );
};

export default VideoPlayerWidget;
