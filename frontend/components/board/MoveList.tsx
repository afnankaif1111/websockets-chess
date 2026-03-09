interface Move {
  move: string;
  moveNumber: number;
}

interface MoveListProps {
  moves: Move[];
}

export default function MoveList({ moves }: MoveListProps) {
  // Group into pairs for display (white move, black move)
  const pairs: { num: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i].move,
      black: moves[i + 1]?.move,
    });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#2a2a4a' }}>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
          Move History
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{ background: '#2a2a4a', color: '#7a7a9a' }}>
          {moves.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {moves.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: '#7a7a9a' }}>
            No moves yet
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {pairs.map((pair) => (
                <tr key={pair.num} className="rounded-lg overflow-hidden">
                  <td className="w-8 px-2 py-1 text-xs text-right rounded-l-lg"
                    style={{ color: '#7a7a9a', background: '#1a1a2e' }}>
                    {pair.num}.
                  </td>
                  <td className="px-3 py-1 font-mono text-sm font-medium"
                    style={{ background: '#1a1a2e', color: '#e8e8f0' }}>
                    {pair.white}
                  </td>
                  <td className="px-3 py-1 font-mono text-sm rounded-r-lg"
                    style={{ background: '#1a1a2e', color: pair.black ? '#e8e8f0' : '#7a7a9a' }}>
                    {pair.black ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
