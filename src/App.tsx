import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/useGameStore';
import OnboardingScreen from './screens/OnboardingScreen';
import MainMenuScreen from './screens/MainMenuScreen';
import GameSetupScreen from './screens/GameSetupScreen';
import GameScreen from './screens/GameScreen';
import SettingsScreen from './screens/SettingsScreen';
import RewardCodeScreen from './screens/RewardCodeScreen';
import ProfileScreen from './screens/ProfileScreen';

const screenComponents = {
  ONBOARDING: OnboardingScreen,
  MENU: MainMenuScreen,
  GAME_SETUP: GameSetupScreen,
  PLAYING: GameScreen,
  SETTINGS: SettingsScreen,
  REWARD_CODE: RewardCodeScreen,
  PROFILE: ProfileScreen,
} as const;

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const ScreenComponent = screenComponents[screen];

  return (
    <div className="w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="w-full h-full"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <ScreenComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
