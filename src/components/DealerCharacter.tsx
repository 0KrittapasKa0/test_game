import { memo, useEffect, useState, type CSSProperties } from 'react';
import type { DealerAction } from '../utils/dealerAnimation';
import type { DealerVariant } from '../types/game';
import { dealerSpriteAsset } from '../utils/gameArt';
import './DealerCharacter.css';

const rows: Record<DealerAction, number> = { idle: 0, shuffle: 1, deal: 2, reveal: 3, win: 4, lose: 5 };
const labels: Record<DealerAction, string> = {
    idle: 'รอผู้เล่น', shuffle: 'กำลังสับไพ่', deal: 'กำลังแจกไพ่',
    reveal: 'เปิดไพ่', win: 'เจ้ามือได้', lose: 'เจ้ามือจ่าย',
};

export default memo(function DealerCharacter({ action: phaseAction, cue = 0, variant = 'male' }: {
    action: DealerAction;
    cue?: number;
    variant?: DealerVariant;
}) {
    const [last, setLast] = useState({ action: phaseAction, cue });
    const [drawCue, setDrawCue] = useState<number | null>(null);

    if (last.action !== phaseAction || last.cue !== cue) {
        setLast({ action: phaseAction, cue });
        if (phaseAction === 'idle' && last.action === 'idle' && cue > last.cue) {
            setDrawCue(cue);
        } else if (phaseAction !== 'idle' || cue < last.cue) {
            setDrawCue(null);
        }
    }

    const action = phaseAction === 'idle' && drawCue !== null ? 'deal' : phaseAction;

    useEffect(() => {
        if (drawCue === null) return;
        // Also clear the gesture when reduced motion disables CSS animation events.
        const timeout = window.setTimeout(() => setDrawCue(null), 400);
        return () => window.clearTimeout(timeout);
    }, [drawCue]);

    return (
        <div className={`dealer-character dealer-character--${action}`} role="img" aria-label={`เจ้ามือ: ${labels[action]}`}>
            <div className="dealer-character__aura" />
            <div
                key={`${action}-${action === 'deal' ? cue : 0}`}
                className="dealer-character__sprite"
                style={{
                    backgroundImage: `url("${dealerSpriteAsset(variant)}")`,
                    '--sprite-row': `${rows[action] * 20}%`,
                } as CSSProperties}
            />
            <span className="dealer-character__title">{labels[action]}</span>
        </div>
    );
});
