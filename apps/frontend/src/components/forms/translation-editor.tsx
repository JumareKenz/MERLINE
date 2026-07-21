'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = [
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'sw', label: 'Swahili' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'am', label: 'Amharic' },
  { code: 'so', label: 'Somali' },
];

interface TranslationEditorProps {
  translations: Record<string, Record<string, string>>;
  onUpdate: (language: string, key: string, value: string) => void;
  onAddLanguage: (language: string) => void;
  onRemoveLanguage: (language: string) => void;
  fieldKeys?: string[];
  fieldLabels?: Record<string, string>;
}

export function TranslationEditor({
  translations,
  onUpdate,
  onAddLanguage,
  onRemoveLanguage,
  fieldKeys = ['label', 'help_text'],
  fieldLabels = { label: 'Question Text', help_text: 'Help Text' },
}: TranslationEditorProps) {
  const [newLang, setNewLang] = useState('');

  const languages = Object.keys(translations);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Translations</p>
        <div className="flex items-center gap-2">
          <Select value={newLang} onValueChange={setNewLang}>
            <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.filter((l) => !languages.includes(l.code)).map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { if (newLang) { onAddLanguage(newLang); setNewLang(''); } }}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {languages.length === 0 && (
        <p className="text-xs text-foreground-secondary">No translations yet. Add a language to begin.</p>
      )}

      <div className="space-y-4">
        {languages.map((lang) => {
          const langInfo = LANGUAGES.find((l) => l.code === lang);
          return (
            <div key={lang} className="p-3 border border-border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase">{langInfo?.label || lang}</span>
                <button onClick={() => onRemoveLanguage(lang)} className="text-foreground-tertiary hover:text-error">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {fieldKeys.map((key) => (
                  <div key={key}>
                    <label className="text-[10px] text-foreground-secondary">{fieldLabels[key] || key}</label>
                    <Input
                      value={translations[lang]?.[key] || ''}
                      onChange={(e) => onUpdate(lang, key, e.target.value)}
                      className="h-7 text-sm"
                      placeholder={`${lang.toUpperCase()} ${fieldLabels[key] || key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
