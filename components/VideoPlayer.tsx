
import React, { useRef, useEffect, useState } from 'react';
import { Lesson } from '../domain/entities';

interface VideoPlayerProps {
  lesson: Lesson;
  onProgress: (watchedSeconds: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ lesson, onProgress }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = lesson.watchedSeconds;
    }
  }, [lesson.id]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = Math.floor(videoRef.current.currentTime);
      setCurrentTime(current);
      // Throttle progress updates to parent to every 5 seconds to avoid excessive state updates
      if (current % 5 === 0 && current !== 0) {
        onProgress(current);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const progressPercent = (currentTime / lesson.durationSeconds) * 100;

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl group border border-slate-700">
      <video
        ref={videoRef}
        src={lesson.videoUrl}
        className="w-full h-auto aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-full bg-slate-700 h-1.5 rounded-full mb-4 overflow-hidden">
          <div 
            className="bg-indigo-500 h-full transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white text-xl hover:text-indigo-400">
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>
            <span className="text-xs text-slate-300 font-medium">
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(lesson.durationSeconds / 60)}:{(lesson.durationSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <i className="fas fa-volume-up hover:text-white cursor-pointer"></i>
            <i className="fas fa-cog hover:text-white cursor-pointer"></i>
            <i className="fas fa-expand hover:text-white cursor-pointer"></i>
          </div>
        </div>
      </div>

      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 bg-indigo-600/90 rounded-full flex items-center justify-center text-white text-3xl shadow-lg transform transition hover:scale-110">
            <i className="fas fa-play ml-1"></i>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
