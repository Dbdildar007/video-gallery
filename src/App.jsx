import React, { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [videoSize, setVideoSize] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitProgress, setSplitProgress] = useState('');
  const fileInputRef = useRef(null);
  const ffmpegRef = useRef(new FFmpeg());

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file.');
        return;
      }
      setVideoFile(file);
      setVideoName(file.name);
      setVideoSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleSplitVideo = async () => {
    if (!videoFile) return;
    setIsSplitting(true);
    setSplitProgress('Loading processing engine...');

    try {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      setSplitProgress('Reading video file...');
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

      setSplitProgress('Slicing into 30s clips...');
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-c:v', 'libx264',       // Re-encode video stream using standard H.264
        '-crf', '22',            // Quality setting (18-28 range: lower is better quality, 22 is balanced)
        '-c:a', 'aac',           // Re-encode audio stream to stable AAC
        '-f', 'segment',
        '-segment_time', '30',
        '-reset_timestamps', '1',
        'output_%03d.mp4'
      ]);

      setSplitProgress('Extracting generated clips...');
      const dirFiles = await ffmpeg.listDir('.');
      const outputFiles = dirFiles.filter(f => f.name.startsWith('output_') && !f.isDir);

      for (const file of outputFiles) {
        const data = await ffmpeg.readFile(file.name);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chunk_${file.name.replace('output_', '')}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      await ffmpeg.deleteFile('input.mp4');
      for (const file of outputFiles) {
        await ffmpeg.deleteFile(file.name);
      }

      alert('Successfully split and downloaded all 30-second clips!');
    } catch (error) {
      console.error(error);
      alert('An error occurred while splitting the video.');
    } finally {
      setIsSplitting(false);
      setSplitProgress('');
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full p-4 sm:p-6 pb-24">

        <header className="text-center my-6 relative">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full -z-10 h-20 w-40 mx-auto"></div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            REEL SLICER
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1.5 font-medium">
            Prepare local videos for processing
          </p>
        </header>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*"
          className="hidden"
        />

        <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-gray-800/80 ring-1 ring-white/5 overflow-hidden">
          {videoFile ? (
            <div className="space-y-5">
              <div className="p-5 bg-gray-950/40 rounded-2xl border border-gray-800/80 relative overflow-hidden group">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    Target File Selected
                  </span>
                  <p className="text-base font-bold text-gray-200 truncate mt-3.5">
                    {videoName}
                  </p>
                  <p className="text-xs font-mono text-gray-400 mt-1">
                    Size: <span className="text-indigo-400 font-semibold">{videoSize}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleSplitVideo}
                disabled={isSplitting}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/10 active:scale-[0.99] disabled:opacity-50 transition-all tracking-wide text-xs uppercase"
              >
                {splitProgress || '✂️ Split into 30 Second Clips'}
              </button>

              <div className="text-center">
                <button
                  onClick={triggerFileSelect}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-4"
                >
                  Choose a different video
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={triggerFileSelect}
              className="group border-2 border-dashed border-gray-800 hover:border-indigo-500/40 rounded-2xl py-12 px-4 text-center cursor-pointer transition-all duration-300 bg-gray-950/20 hover:bg-gray-950/40"
            >
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h18M3 16h18" />
                </svg>
              </div>
              <p className="text-gray-300 text-sm font-semibold group-hover:text-indigo-400 transition-colors">
                Select a video file
              </p>
              <p className="text-gray-500 text-xs mt-1.5 max-w-xs mx-auto">
                Tap anywhere to browse your local device or camera roll
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
} // <--- Make sure this final bracket closes the App function!
