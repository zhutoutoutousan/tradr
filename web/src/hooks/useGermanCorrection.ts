"use client";

import { useState, useCallback } from 'react';

export interface GermanCorrection {
  original: string;
  corrected: string;
  changes: Array<{
    type: 'grammar' | 'spelling' | 'style' | 'capitalization';
    original: string;
    corrected: string;
    explanation: string;
  }>;
}

// Common German corrections
const CORRECTIONS: Record<string, { correct: string; explanation: string; type: string }> = {
  // Capitalization
  'ansässigkeit': { correct: 'Ansässigkeit', explanation: 'Substantive werden großgeschrieben', type: 'capitalization' },
  'spracheweise': { correct: 'Sprachweise', explanation: 'Substantive werden großgeschrieben', type: 'capitalization' },
  
  // Common misspellings
  'symbols': { correct: 'Symbole', explanation: 'Deutsche Pluralform', type: 'spelling' },
  'indikatoren': { correct: 'Indikatoren', explanation: 'Korrekte Schreibweise', type: 'spelling' },
  
  // Grammar
  'anderes': { correct: 'anderen', explanation: 'Dativ Plural', type: 'grammar' },
  'jeweils ich': { correct: 'jeweils wenn ich', explanation: 'Fehlende Konjunktion', type: 'grammar' },
};

// Better alternatives for common phrases
const STYLE_SUGGESTIONS: Record<string, { better: string; explanation: string }> = {
  'ansässigkeit': { better: 'Beständigkeit', explanation: 'Passenderer Begriff für "permanence"' },
  'langfristige ansässigkeit': { better: 'langfristige Beständigkeit', explanation: 'Besserer Ausdruck' },
  'fokus spracheweise': { better: 'Fokus auf die Sprachweise', explanation: 'Vollständiger Ausdruck' },
};

export function useGermanCorrection() {
  const [lastCorrection, setLastCorrection] = useState<GermanCorrection | null>(null);

  const correct = useCallback((text: string): GermanCorrection => {
    let corrected = text;
    const changes: GermanCorrection['changes'] = [];

    // Apply known corrections
    for (const [wrong, { correct, explanation, type }] of Object.entries(CORRECTIONS)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      if (regex.test(corrected)) {
        corrected = corrected.replace(regex, correct);
        changes.push({
          type: type as any,
          original: wrong,
          corrected: correct,
          explanation
        });
      }
    }

    // Check for style improvements
    for (const [phrase, { better, explanation }] of Object.entries(STYLE_SUGGESTIONS)) {
      if (text.toLowerCase().includes(phrase)) {
        changes.push({
          type: 'style',
          original: phrase,
          corrected: better,
          explanation
        });
        corrected = corrected.replace(new RegExp(phrase, 'gi'), better);
      }
    }

    // Common grammar patterns
    corrected = corrected
      // Fix: "dass Login" → "dass Sie ein Login"
      .replace(/dass\s+([A-Z])/g, 'dass Sie ein $1')
      // Fix: "bitte geben Sie mir ein Korrektur" → "bitte geben Sie mir eine Korrektur"
      .replace(/ein\s+(Korrektur|Antwort|Frage)/g, 'eine $1')
      // Fix missing articles
      .replace(/erstellen,?\s+sodass/gi, 'erstellen, sodass')
      // Fix: "vielleicht Indikatoren z.B." → "vielleicht Indikatoren gibt, z.B."
      .replace(/Indikatoren\s+z\.B\./gi, 'Indikatoren gibt, z.B.');

    const result: GermanCorrection = {
      original: text,
      corrected,
      changes
    };

    setLastCorrection(result);
    return result;
  }, []);

  const formatCorrection = useCallback((correction: GermanCorrection): string => {
    let output = '📝 **Sprachkorrektur:**\n\n';
    output += `**Ihr Text:**\n> "${correction.original}"\n\n`;
    output += `**Korrigiert:**\n> "${correction.corrected}"\n\n`;

    if (correction.changes.length > 0) {
      output += '**Änderungen:**\n';
      correction.changes.forEach((change, i) => {
        const icon = {
          grammar: '📗',
          spelling: '📕',
          style: '📘',
          capitalization: '📙'
        }[change.type];
        
        output += `${i + 1}. ${icon} "${change.original}" → "${change.corrected}"\n`;
        output += `   *${change.explanation}*\n`;
      });
    }

    return output;
  }, []);

  return {
    correct,
    formatCorrection,
    lastCorrection,
  };
}

// Standalone function for quick corrections
export function correctGerman(text: string): GermanCorrection {
  const hook = { correct: () => ({} as GermanCorrection) };
  return useGermanCorrection().correct(text);
}
