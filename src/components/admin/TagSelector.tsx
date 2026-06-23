import { useMemo, useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeTag } from '@/lib/titleFormOptions';

interface TagSelectorProps {
  label: string;
  placeholder?: string;
  description?: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
}

const TagSelector = ({
  label,
  placeholder = 'Digite e pressione Enter',
  description,
  options,
  value,
  onChange,
}: TagSelectorProps) => {
  const [inputValue, setInputValue] = useState('');

  const normalizedSelected = useMemo(
    () => value.map((item) => item.toLowerCase()),
    [value],
  );

  const suggestions = useMemo(() => {
    const search = inputValue.trim().toLowerCase();

    return options.filter((option) => {
      if (normalizedSelected.includes(option.toLowerCase())) return false;
      if (!search) return true;
      return option.toLowerCase().includes(search);
    });
  }, [inputValue, normalizedSelected, options]);

  const addTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    if (normalizedSelected.includes(normalized.toLowerCase())) {
      setInputValue('');
      return;
    }

    onChange([...value, normalized]);
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{label}</Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag(inputValue);
            }
          }}
          placeholder={placeholder}
          className="rounded-xl"
        />
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => addTag(inputValue)}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Sugestões
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 18).map((option) => (
            <Button
              key={option}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full border border-border bg-background px-3 text-xs hover:bg-accent"
              onClick={() => addTag(option)}
            >
              {option}
            </Button>
          ))}
          {!suggestions.length ? (
            <p className="text-xs text-muted-foreground">Nenhuma sugestão restante.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Selecionadas ({value.length})</div>
        <div className="flex min-h-11 flex-wrap gap-2 rounded-2xl border border-border bg-background p-3">
          {value.length ? (
            value.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 rounded-full px-3 py-1 text-xs">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="transition-opacity hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma tag adicionada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagSelector;
