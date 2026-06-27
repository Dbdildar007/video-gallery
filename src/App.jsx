import React, { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [videoSize, setVideoSize] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitProgress, setSplitProgress] = useState('');
  const [downloadLinks, setDownloadLinks] = useState([]);

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
      setDownloadLinks([]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // Helper function to get video duration inside browser
  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
    });
  };

  const handleSplitVideo = async () => {
    if (!videoFile) return;
    setIsSplitting(true);
    setDownloadLinks([]);
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

      setSplitProgress('Analyzing movie length...');
      const totalDuration = await getVideoDuration(videoFile);

      setSplitProgress('Mounting file to engine...');
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

      const segmentLength = 30;
      const batchSize = 600;    // 10-minute safe memory processing slots
      const allGeneratedClips = [];

      let currentStart = 0;
      let batchIndex = 1;

      // 1. Process and Slice Video Chronologically in Batches
      while (currentStart < totalDuration) {
        const currentEnd = Math.min(currentStart + batchSize, totalDuration);
        const batchDuration = currentEnd - currentStart;

        setSplitProgress(`Processing batch ${batchIndex} (${Math.floor(currentStart / 60)}m to ${Math.floor(currentEnd / 60)}m)...`);

        await ffmpeg.exec([
          '-ss', currentStart.toString(),
          '-i', 'input.mp4',
          '-t', batchDuration.toString(),
          '-c', 'copy',
          'batch_temp.mp4'
        ]);

        await ffmpeg.exec([
          '-i', 'input.mp4',
          '-c', 'copy',
          '-f', 'segment',
          '-segment_time', '30',
          '-reset_timestamps', '1',
          'output_%03d.mp4'
        ]);

        const dirFiles = await ffmpeg.listDir('.');
        const outputFiles = dirFiles
          .filter(f => f.name.startsWith('output_') && !f.isDir)
          .sort((a, b) => a.name.localeCompare(b.name));

        for (const file of outputFiles) {
          const data = await ffmpeg.readFile(file.name);
          const blob = new Blob([data.buffer], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);

          const realClipNumber = allGeneratedClips.length + 1;
          const clipName = `Clip_${realClipNumber.toString().padStart(3, '0')}.mp4`;

          allGeneratedClips.push({ name: clipName, url: url });

          // Free file memory from WebAssembly virtual filesystem instantly
          await ffmpeg.deleteFile(file.name);
        }

        await ffmpeg.deleteFile('batch_temp.mp4');
        currentStart += batchSize;
        batchIndex++;
      }

      // Cleanup master input file from internal virtual store
      await ffmpeg.deleteFile('input.mp4');

      // Update state for UI visual listing
      setDownloadLinks(allGeneratedClips);

      // 2. Automated Sequential Downloader Loop with Paced Throttling
      setSplitProgress('Triggering automated downloads...');
      for (let i = 0; i < allGeneratedClips.length; i++) {
        const clip = allGeneratedClips[i];

        await new Promise((resolve) => {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = clip.url;
            a.download = clip.name;
            document.body.appendChild(a);
            a.click();

            // Clean up the DOM reference element
            setTimeout(() => {
              document.body.removeChild(a);
            }, 150);

            resolve();
          }, i === 0 ? 0 : 450); // 450ms pacing delay protects browser queue order
        });
      }

      alert(`Slicing complete! ${allGeneratedClips.length} sequential clips have been pushed to your system downloads.`);

    } catch (error) {
      console.error(error);
      alert('An error occurred while splitting the large movie file.');
    } finally {
      setIsSplitting(false);
      setSplitProgress('');
    }
  }; // <--- Safely closes handleSplitVideo function block completely

  return (
    <div className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full p-4 sm:p-6 pb-24 space-y-6">

        <header className="text-center my-6 relative">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full -z-10 h-20 w-40 mx-auto"></div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            REEL SLICER PRO
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1.5 font-medium">
            Long-Form Movie Sequential Processor
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
            Local Slicing Pipeline
          </h3>

          {videoFile ? (
            <div className="space-y-5">
              <div className="p-5 bg-gray-950/40 rounded-2xl border border-gray-800/80 relative overflow-hidden group">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    Movie File Ready
                  </span>
                  <p className="text-base font-bold text-gray-200 truncate mt-3.5">
                    {videoName}
                  </p>
                  <p className="text-xs font-mono text-gray-400 mt-1">
                    Size: <span className="text-indigo-400 font-semibold">{videoSize}</span>
                  </p>
                </div>
              </div>

              {downloadLinks.length === 0 && (
                <button
                  onClick={handleSplitVideo}
                  disabled={isSplitting}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/10 active:scale-[0.99] disabled:opacity-50 transition-all tracking-wide text-xs uppercase"
                >
                  {splitProgress || '✂️ Start Long Video Slicing'}
                </button>
              )}

              {downloadLinks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Generated Ordered Clips ({downloadLinks.length}) :
                  </h3>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {downloadLinks.map((clip, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-950/40 border border-gray-800 rounded-xl">
                        <span className="text-xs truncate max-w-[180px] text-gray-300 font-mono">{clip.name}</span>
                        <a
                          href={clip.url}
                          download={clip.name}
                          className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg uppercase tracking-wide transition-all"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={triggerFileSelect}
                  disabled={isSplitting}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-4 disabled:opacity-30"
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
                Select Movie File
              </p>
              <p className="text-gray-500 text-xs mt-1.5 max-w-xs mx-auto">
                Supports long videos (MP4, MKV, MOV) up to multiple hours
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
