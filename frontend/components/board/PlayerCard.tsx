interface PlayerCardProps {
  username: string | undefined;
  color: 'white' | 'black';
  isActive: boolean;
  isYou: boolean;
}

export default function PlayerCard({ username, color, isActive, isYou }: PlayerCardProps) {
  const icon = color === 'white' ? '♔' : '♚';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300"
      style={{
        background: isActive ? 'rgba(233,69,96,0.08)' : '#1a1a2e',
        border: `1px solid ${isActive ? 'rgba(233,69,96,0.3)' : '#2a2a4a'}`,
      }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{username ?? 'Waiting…'}</p>
        <p className="text-xs capitalize" style={{ color: '#7a7a9a' }}>
          {color}{isYou ? ' · You' : ''}
        </p>
      </div>
      {isActive && (
        <div className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: '#e94560' }} />
      )}
    </div>
  );
}
