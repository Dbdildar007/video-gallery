import React, { useState, useEffect } from 'react';

// Explicit backend API base URL
const API_BASE_URL = "http://10.106.169.200:8000";

export default function App() {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', isError: false, show: false });

  // Show status popup alerts
  const showToast = (message, isError = false) => {
    setToast({ message, isError, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };


  // Fetch all sliced mkv/mp4 chunk videos
  const fetchChunks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/videos`);
      if (!response.ok) throw new Error("Could not load your clips");
      const data = await response.json();
      setChunks(data.files || []);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  console.log("ddddd")

  // Load files automatically on page mount
  useEffect(() => {
    fetchChunks();
  }, []);

  return (
    <div className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100 min-h-screen font-sans antialiased selection:bg-indigo-500/30">
      <div className="max-w-md mx-auto p-4 sm:p-6 pb-24">
        
        {/* Header Section */}
        <header className="text-center my-8 relative">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full -z-10 h-20 w-40 mx-auto"></div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            REEL LIBRARY
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1.5 font-medium">
            Tap to save directly to your mobile device
          </p>
        </header>

        {/* Gallery Base Container */}
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-gray-800/80 ring-1 ring-white/5">
          
          {/* Controls Bar */}
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Available Clips ({chunks.length})
              </h2>
            </div>
            
            <button 
              onClick={fetchChunks} 
              disabled={loading}
              className="text-xs font-semibold px-3 py-1.5 bg-gray-800 hover:bg-gray-700/80 border border-gray-700/50 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-indigo-400"
            >
              {loading ? "Syncing..." : "🔄 Refresh"}
            </button>
          </div>
          
          {/* Video Item Queue */}
          <div className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
            {chunks.length > 0 ? (
              chunks.map((file, idx) => (
                <div 
                  key={idx} 
                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-800/40 to-gray-800/70 rounded-2xl border border-gray-800 hover:border-indigo-500/40 hover:from-gray-800/80 transition-all duration-300 shadow-sm"
                >
                  {/* Left Side: File Metadata */}
                  <div className="flex flex-col min-w-0 flex-1 pr-4">
                    <span className="text-sm font-semibold text-gray-200 truncate group-hover:text-indigo-300 transition-colors">
                      {file}
                    </span>
                    <span className="text-[11px] font-mono tracking-wider text-gray-500 mt-0.5 uppercase">
                      Segment {(idx + 1).toString().padStart(2, '0')} • 30s
                    </span>
                  </div>
                  
                  {/* Right Side: Clean Download Button */}
                  <a 
                    href={`${API_BASE_URL}/chunks/${file}`} 
                    download={file} 
                    onClick={() => showToast(`Downloading Part ${idx + 1}...`)}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold px-5 py-3 rounded-xl hover:from-indigo-500 hover:to-indigo-600 shadow-lg shadow-indigo-600/10 active:scale-95 active:shadow-none transition-all duration-200 tracking-wide uppercase"
                  >
                    Download
                  </a>
                </div>
              ))
            ) : (
              !loading && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-gray-800 rounded-2xl">
                  <p className="text-gray-400 text-sm font-medium">Your clip storage is currently empty.</p>
                  <p className="text-gray-600 text-xs mt-1">Please slice a file on the server machine to generate media.</p>
                </div>
              )
            )}
          </div>

        </div>

      </div>

      {/* Modern Compact Toast Alert */}
      {toast.show && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-2xl shadow-2xl text-xs uppercase tracking-wider font-bold z-50 border backdrop-blur-md transition-all duration-300 animate-bounce ${
          toast.isError ? 'bg-red-950/90 border-red-500/50 text-red-200' : 'bg-gray-950/90 border-indigo-500/40 text-indigo-300'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}