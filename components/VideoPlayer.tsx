
import React, { useRef, useEffect, useState } from 'react';
import { Lesson } from '../domain/entities';

interface VideoPlayerProps {
  lesson: Lesson;
  videoUrl?: string; // Allow parent to override which video to display
  onProgress: (watchedSeconds: number) => void;
  onPlay?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ lesson, videoUrl, onProgress, onPlay }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = lesson.durationSeconds || 1;
  const showManualComplete = Boolean((import.meta as any)?.env?.DEV);

  const currentVideoUrl = videoUrl || lesson.videoUrl; // Use provided videoUrl or fallback to lesson.videoUrl

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

  const handleEnded = () => {
    // Se o vídeo terminar, marcamos como visto todo o tempo
    onProgress(duration);
    setCurrentTime(duration);
    setIsPlaying(false);
  };

  const markAsCompleted = () => {
    // Botão manual para vídeos demo que não avançam; força progresso total
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onProgress(duration);
    setCurrentTime(duration);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const isYoutube = currentVideoUrl?.includes('youtube.com') || currentVideoUrl?.includes('youtu.be');

  const getYoutubeEmbedUrl = (url: string) => {
    // Extrair ID do YouTube
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : '';
  };

  const progressPercent = Math.min(100, (currentTime / duration) * 100);

  if (!currentVideoUrl) {
    return (
      <div className="relative w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-black text-lg">Vídeo não configurado</p>
            <p className="text-slate-300 text-sm mt-1">Adicione uma URL de vídeo na gestão de conteúdo para esta aula.</p>
          </div>
          {showManualComplete && (
            <button
              onClick={markAsCompleted}
              className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition flex-shrink-0"
            >
              Marcar como concluída
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl group border border-slate-700">
      {isYoutube ? (
        <iframe
          className="w-full h-auto aspect-video pointer-events-auto"
          src={getYoutubeEmbedUrl(currentVideoUrl)}
          title={lesson.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      ) : (
        <video
          ref={videoRef}
          src={currentVideoUrl}
          className="w-full h-auto aspect-video"
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          onPlay={() => { setIsPlaying(true); onPlay?.(); }}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
        />
      )}

      {/* Custom Controls Overlay - Hidden for YouTube */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity ${isYoutube ? 'hidden' : ''}`}>
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

      {!isPlaying && !isYoutube && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 bg-indigo-600/90 rounded-full flex items-center justify-center text-white text-3xl shadow-lg transform transition hover:scale-110">
            <i className="fas fa-play ml-1"></i>
          </div>
        </div>
      )}

      {showManualComplete && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={markAsCompleted}
            className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            Marcar como concluída
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
