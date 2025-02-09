'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StrategyScheduler } from '@/lib/strategies/scheduler';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);
  const { userId, isAuthenticated, login, isLoading } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      StrategyScheduler.getInstance().initializeScheduler(userId);
    }
  }, [userId]);

  const handleLaunch = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }

    setIsLaunching(true);
    document.body.classList.add('launching');

    try {
      const response = await fetch('/api/services/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Initialization failed');

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Initialization error:', error);
      setIsLaunching(false);
      document.body.classList.remove('launching');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-deep-space transition-all duration-1000">
      <div className={`star-field absolute inset-0 transition-opacity duration-1000 ${isLaunching ? 'launching' : ''}`} />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h1
            className="inline-block text-9xl font-bold font-space"
            style={{
              background: 'linear-gradient(to right, #0EA5E9, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            ASTRA
          </h1>
          <p className="text-2xl mt-4 text-stellar-blue/80 font-space">
            Autonomous Strategy Trading & Rebalancing Assistant
          </p>
        </div>

        {!isLaunching ? (
          <button
            onClick={handleLaunch}
            disabled={isLoading}
            className="mt-12 launch-button px-8 py-4 text-xl font-bold rounded-full
                     bg-cosmic-gradient hover:bg-cosmic-gradient/90
                     transform hover:scale-105 transition-all duration-300
                     text-neural-white font-space
                     shadow-[0_0_20px_rgba(92,36,255,0.5)]
                     hover:shadow-[0_0_30px_rgba(92,36,255,0.7)]"
          >
            {isLoading ? 'Loading...' : isAuthenticated ? 'Initiate Launch Sequence' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="launch-sequence mt-12">
            <div
              className="text-6xl font-bold text-center animate-pulse font-space"
              style={{
                background: 'linear-gradient(to right, #0EA5E9, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Launching Control Systems
              <span className="loading-dots">...</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
