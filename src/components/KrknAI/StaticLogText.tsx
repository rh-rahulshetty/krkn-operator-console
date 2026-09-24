import { useMemo } from 'react';
import { LogTerminal } from '../LogTerminal';

interface StaticLogTextProps {
  logText: string;
}

export function StaticLogText({ logText }: StaticLogTextProps) {
  const logs = useMemo(() => logText ? [logText] : [], [logText]);

  return logs.length > 0
    ? <LogTerminal logs={logs} ariaLabel="Log output" />
    : <p className="krkn-ai-not-available">Not available yet</p>;
}
