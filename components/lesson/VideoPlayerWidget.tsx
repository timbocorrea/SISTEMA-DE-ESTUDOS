import React, { useEffect } from 'react';
import { throttle } from '../../utils/performance';
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

    // Create a throttled version of the update function
    // We use a ref to keep the same throttled function instance across renders
    const throttledUpdate = React.useRef(
        throttle(async (ws: number) => {
            await onProgressUpdate(ws);
        }, 10000) // Ensure max 1 update per 10s
    ).current;

    const handleVideoProgress = async (watchedSeconds: number) => {
        setCurrentTime(watchedSeconds);
        // Call the throttled function for DB updates
        throttledUpdate(watchedSeconds);
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
