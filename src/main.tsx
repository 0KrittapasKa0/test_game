import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAudio } from './utils/sound'
import { preloadEmojis } from './components/FloatingEmoji'
import { EMOJI_CATEGORIES } from './components/EmojiPicker'

initAudio();

// Preload & cache all emoji images on app startup (persistent offline)
const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
preloadEmojis(allEmojis);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
