import { useMemo } from 'react';
import Anser from 'anser';

interface StaticLogTextProps {
  logText: string;
}

export function StaticLogText({ logText }: StaticLogTextProps) {
  const displayText = useMemo(() => Anser.ansiToText(logText), [logText]);

  return displayText
    ? <pre className="krkn-ai-log-panel__lines">{displayText}</pre>
    : <p className="krkn-ai-not-available">Not available yet</p>;
}
