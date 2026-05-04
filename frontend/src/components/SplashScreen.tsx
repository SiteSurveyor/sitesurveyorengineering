import { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 3000 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = 30;
    const steps = duration / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      // Ease-out curve for natural feel
      const raw = current / steps;
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(Math.min(eased * 100, 100));

      if (current >= steps) {
        clearInterval(timer);
        setFadeOut(true);
        setTimeout(onFinish, 600); // wait for fade-out animation
      }
    }, interval);

    return () => clearInterval(timer);
  }, [duration, onFinish]);

  return (
    <div className={`splash-screen ${fadeOut ? 'splash-fade-out' : ''}`}>
      <div className="splash-content">
        <img
          src="/logo.svg"
          alt="SiteSurveyor Logo"
          className="splash-logo app-logo"
        />
        <p className="splash-tagline">SiteSurveyor</p>
        <p className="splash-subtitle">Engineering Survey Management</p>
        <div className="splash-loader-track">
          <div
            className="splash-loader-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="splash-loading-text">Loading...</span>
      </div>
    </div>
  );
}
