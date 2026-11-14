# Game artwork

Generated with the built-in image_gen tool. Exact production prompts are in
`game-art-prompts.json`. Production assets are committed under `public/art/`;
the app never depends on generated files outside the project.

- `lobby.png`: shared backdrop for splash, onboarding, menu, setup, profile,
  settings, activities, mailbox and online join.
- `standard.png`, `high-stakes.png`, `expert.png`, `legendary.png`, `ultimate.png`:
  room backgrounds selected from the actual room category in offline and online play.
- `table.png`: transparent top-down table with wood, leather, brass and felt.
  A color overlay changes only the felt for each room tier.
- `dealer.png`: transparent 1024 × 1536 sprite sheet, four columns and six rows.
  Each frame is 256 × 256. Rows are idle, shuffle, deal, reveal, win, lose.

The dealer character appears only for AI dealers. Human dealers keep their player
avatar. The action is derived from the live phase, total cards dealt and dealer
result. Each new dealt card restarts the dealing gesture. Shuffling lasts until
the first card enters a hand; real cards continue to use the existing textures
and animation timing. Sprite cards are decorative and do not represent a hand.

CSS frame playback uses four registered poses per action, with separate action
timings. Reduced-motion preferences show a static pose. This is frame animation,
not real-time 3D, motion capture, or generated video.

Validation: dealer action selection checked for nine phase/result combinations;
desktop and mobile layouts reviewed in a temporary in-browser game fixture.
Online presentation is connected to the shared character, but multiplayer sync
has not been tested across separate machines.
