import { useEffect, useState } from 'react';
import Photobooth from './components/Photobooth';
import SharePage from './components/SharePage';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const searchParams = new URLSearchParams(window.location.search);
  const shareId = searchParams.get('id');

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex flex-col">
      {currentPath.startsWith('/share') ? (
        <SharePage id={shareId} />
      ) : (
        <Photobooth />
      )}
      <Analytics />
    </div>
  );
}