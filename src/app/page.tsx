'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = async () => {
    setIsLaunching(true);
    document.body.classList.add('launching');

    // Wait for initialization
    try {
      const response = await fetch('/api/services/init', { method: 'POST' });
      if (!response.ok) throw new Error('Initialization failed');
    } catch (error) {
      console.error('Initialization error:', error);
    }

    // Give more time for the hyperspace animation
    setTimeout(() => {
      router.push('/dashboard');
    }, 5000); // Increased to 5 seconds for fuller experience
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-deep-space transition-all duration-1000">
      <div className={`star-field absolute inset-0 transition-opacity duration-1000 ${isLaunching ? 'launching' : ''}`} />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-8xl font-bold mb-8 text-center">
          <span className="animate-gradient-xy inline-block bg-gradient-to-r from-cosmic-pink via-[#ECBFBF] to-stellar-blue text-transparent bg-clip-text font-space">
            ASTRA
          </span>
          <span className="block text-xl mt-4 text-stellar-blue/80 font-space">
            Autonomous Strategy Trading & Rebalancing Assistant
          </span>
        </h1>

        {!isLaunching ? (
          <button
            onClick={handleLaunch}
            className="launch-button px-8 py-4 text-xl font-bold rounded-full
                     bg-cosmic-gradient hover:bg-cosmic-gradient/90
                     transform hover:scale-105 transition-all duration-300
                     text-neural-white font-space
                     shadow-[0_0_20px_rgba(92,36,255,0.5)]
                     hover:shadow-[0_0_30px_rgba(92,36,255,0.7)]"
          >
            Initiate Launch Sequence
          </button>
        ) : (
          <div className="launch-sequence">
            <div className="text-6xl font-bold text-center animate-pulse
                          bg-gradient-to-r from-cosmic-pink via-[#ECBFBF] to-stellar-blue
                          text-transparent bg-clip-text font-space">
              Launching Control Systems
              <span className="loading-dots">...</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
