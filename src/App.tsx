import { useGameStore } from './store/useGameStore';
import { useState, useEffect, lazy, Suspense } from 'react';
import { loadSettings } from './utils/storage';
import SplashScreen from './screens/SplashScreen';
import { useOnlineStore } from './store/useOnlineStore';
import { GameScene } from './components/GameScene';

const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen'));
const MainMenuScreen = lazy(() => import('./screens/MainMenuScreen'));
const GameSetupScreen = lazy(() => import('./screens/GameSetupScreen'));
const GameScreen = lazy(() => import('./screens/GameScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const ActivitiesScreen = lazy(() => import('./screens/ActivitiesScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const OnlineGameScreen = lazy(() => import('./screens/OnlineGameScreen'));
const OnlineJoinScreen = lazy(() => import('./screens/OnlineJoinScreen'));
const MailboxScreen = lazy(() => import('./screens/MailboxScreen'));

const screenComponents = {
  SPLASH: SplashScreen,
  ONBOARDING: OnboardingScreen,
  MENU: MainMenuScreen,
  GAME_SETUP: GameSetupScreen,
  PLAYING: GameScreen,
  ONLINE_PLAYING: OnlineGameScreen,
  ONLINE_JOIN: OnlineJoinScreen,
  SETTINGS: SettingsScreen,
  ACTIVITIES: ActivitiesScreen,
  PROFILE: ProfileScreen,
  MAILBOX: MailboxScreen,
} as const;

export default function App() {
  const currentScreen = useGameStore((s) => s.screen);
  const offlineCategory = useGameStore((s) => s.config?.room.category);
  const onlineCategory = useOnlineStore((s) => s.config?.room.category);
  const playing = currentScreen === 'PLAYING' || currentScreen === 'ONLINE_PLAYING';
  const [graphicQuality, setGraphicQuality] = useState('HIGH');

  useEffect(() => {
    const handleSettingsChange = () => {
      const settings = loadSettings();
      setGraphicQuality(settings.graphicQuality);
    };
    handleSettingsChange(); // Initial check
    window.addEventListener('settings_changed', handleSettingsChange);
    return () => window.removeEventListener('settings_changed', handleSettingsChange);
  }, []);

  const qualityClass = graphicQuality === 'LOW' ? 'low-spec-mode low-memory-mode' : graphicQuality === 'STANDARD' ? 'low-memory-mode' : '';

  return (
    <div className={`w-full h-full overflow-hidden relative bg-black ${qualityClass}`}>
      <GameScene lobby={!playing} category={currentScreen === 'ONLINE_PLAYING' ? onlineCategory : offlineCategory} />
      {Object.entries(screenComponents).map(([key, ScreenComponent]) => {
        const screenKey = key as keyof typeof screenComponents;
        const isActive = currentScreen === screenKey;

        // Render only the active screen to save memory, especially on mobile devices (iOS Safari limits)
        if (!isActive) return null;

        return (
          <div
            key={key}
            className={`scene-screen absolute inset-0 w-full h-full origin-center transition-all duration-200 ease-out opacity-100 scale-100 pointer-events-auto z-10`}
          >
            <Suspense fallback={null}>
              <ScreenComponent />
            </Suspense>
          </div>
        );
      })}
    </div>
  );
}
