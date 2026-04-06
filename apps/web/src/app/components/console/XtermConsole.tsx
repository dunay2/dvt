import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

type XtermConsoleProps = {
  readonly lines: string[];
};

const THEME = {
  background: '#0f172a',
  foreground: '#e2e8f0',
  cursor: '#e2e8f0',
  selectionBackground: '#334155',
};

export default function XtermConsole({ lines }: XtermConsoleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const prevLineCountRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      lineHeight: 1.4,
      scrollback: 5000,
      theme: THEME,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      prevLineCountRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    if (lines.length < prevLineCountRef.current) {
      terminal.clear();
      prevLineCountRef.current = 0;
    }

    const newLines = lines.slice(prevLineCountRef.current);
    for (const line of newLines) {
      terminal.writeln(line);
    }
    prevLineCountRef.current = lines.length;

    fitAddonRef.current?.fit();
  }, [lines]);

  return <div ref={containerRef} className="h-full w-full" data-testid="xterm-console" />;
}
