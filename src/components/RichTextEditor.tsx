import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, Type, Heading1, Heading2, Quote, List, ListOrdered, Minus, Undo, Redo } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const RichTextEditor = ({ value, onChange, placeholder, rows = 16 }: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const insertFormatting = useCallback((before: string, after: string = before) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newText);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText ? start + before.length + selectedText.length + after.length : start + before.length;
      textarea.setSelectionRange(
        start + before.length,
        selectedText ? start + before.length + selectedText.length : start + before.length
      );
    }, 0);
  }, [value, onChange, history, historyIndex]);

  const insertAtLineStart = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newText);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newText);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [value, onChange, history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  }, [history, historyIndex, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  }, [history, historyIndex, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Debounce history updates
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    if (newHistory.length > 50) newHistory.shift(); // Limit history size
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [onChange, history, historyIndex]);

  const toolbarButtons = [
    { icon: Bold, label: 'Negrito', action: () => insertFormatting('**'), shortcut: 'Ctrl+B' },
    { icon: Italic, label: 'Itálico', action: () => insertFormatting('*'), shortcut: 'Ctrl+I' },
    { icon: Heading1, label: 'Título 1', action: () => insertAtLineStart('# ') },
    { icon: Heading2, label: 'Título 2', action: () => insertAtLineStart('## ') },
    { icon: Quote, label: 'Citação', action: () => insertAtLineStart('> ') },
    { icon: List, label: 'Lista', action: () => insertAtLineStart('- ') },
    { icon: ListOrdered, label: 'Lista Numerada', action: () => insertAtLineStart('1. ') },
    { icon: Minus, label: 'Separador', action: () => insertFormatting('\n---\n', '') },
  ];

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-t-lg border border-border border-b-0 flex-wrap">
          {toolbarButtons.map((button, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={button.action}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{button.label} {button.shortcut && <span className="text-xs text-muted-foreground ml-1">({button.shortcut})</span>}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          <div className="h-6 w-px bg-border mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Desfazer <span className="text-xs text-muted-foreground">(Ctrl+Z)</span></p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Refazer <span className="text-xs text-muted-foreground">(Ctrl+Y)</span></p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm rounded-t-none border-t-0"
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
              e.preventDefault();
              insertFormatting('**');
            } else if (e.key === 'i') {
              e.preventDefault();
              insertFormatting('*');
            } else if (e.key === 'z') {
              e.preventDefault();
              handleUndo();
            } else if (e.key === 'y') {
              e.preventDefault();
              handleRedo();
            }
          }
        }}
      />
      
      <p className="text-xs text-muted-foreground">
        Use **texto** para <strong>negrito</strong>, *texto* para <em>itálico</em>, # para títulos
      </p>
    </div>
  );
};

export default RichTextEditor;
