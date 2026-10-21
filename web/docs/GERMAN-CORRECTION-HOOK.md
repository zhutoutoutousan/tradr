# German Language Correction Hook

Automatische Korrektur und Verbesserung deutscher Texte.

## 🎯 Übersicht

Der `useGermanCorrection` Hook bietet automatische Korrekturen für:
- ✅ **Rechtschreibung** (Spelling)
- ✅ **Grammatik** (Grammar)
- ✅ **Großschreibung** (Capitalization)
- ✅ **Stil** (Style Improvements)

## 🚀 Verwendung

### Basic Usage

```typescript
import { useGermanCorrection } from '@/hooks/useGermanCorrection';

function MyComponent() {
  const { correct, formatCorrection } = useGermanCorrection();
  
  const userText = "Also gut, bitte mit mehr symbols";
  const correction = correct(userText);
  
  console.log(correction.corrected);
  // "Also gut, bitte mit mehr Symbole"
  
  console.log(formatCorrection(correction));
  // Formatierte Ausgabe mit allen Änderungen
}
```

### Vollständiges Beispiel

```typescript
import { useGermanCorrection } from '@/hooks/useGermanCorrection';

function ChatInput() {
  const { correct, formatCorrection, lastCorrection } = useGermanCorrection();
  const [input, setInput] = useState('');
  const [showCorrections, setShowCorrections] = useState(false);
  
  const handleSubmit = () => {
    const correction = correct(input);
    
    if (correction.changes.length > 0) {
      setShowCorrections(true);
      // Optional: automatisch korrigieren
      setInput(correction.corrected);
    }
  };
  
  return (
    <div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      
      <button onClick={handleSubmit}>
        Prüfen & Korrigieren
      </button>
      
      {showCorrections && lastCorrection && (
        <div className="corrections">
          <pre>{formatCorrection(lastCorrection)}</pre>
        </div>
      )}
    </div>
  );
}
```

## 📚 API Reference

### Hook Return Values

```typescript
interface UseGermanCorrectionReturn {
  correct: (text: string) => GermanCorrection;
  formatCorrection: (correction: GermanCorrection) => string;
  lastCorrection: GermanCorrection | null;
}
```

### GermanCorrection Type

```typescript
interface GermanCorrection {
  original: string;
  corrected: string;
  changes: Array<{
    type: 'grammar' | 'spelling' | 'style' | 'capitalization';
    original: string;
    corrected: string;
    explanation: string;
  }>;
}
```

## 🔧 Verfügbare Korrekturen

### Rechtschreibung (Spelling)

| Falsch | Richtig | Erklärung |
|--------|---------|-----------|
| symbols | Symbole | Deutsche Pluralform |
| indikatoren | Indikatoren | Korrekte Schreibweise |

### Großschreibung (Capitalization)

| Falsch | Richtig | Erklärung |
|--------|---------|-----------|
| ansässigkeit | Ansässigkeit | Substantive werden großgeschrieben |
| spracheweise | Sprachweise | Substantive werden großgeschrieben |

### Grammatik (Grammar)

| Falsch | Richtig | Erklärung |
|--------|---------|-----------|
| anderes Indikatoren | anderen Indikatoren | Dativ Plural |
| jeweils ich | jeweils wenn ich | Fehlende Konjunktion |
| dass Login System | dass Sie ein Login-System | Fehlender Artikel/Verb |
| ein Korrektur | eine Korrektur | Falscher Artikel (feminin) |

### Stil (Style)

| Original | Besser | Erklärung |
|----------|--------|-----------|
| ansässigkeit | Beständigkeit | Passenderer Begriff |
| langfristige ansässigkeit | langfristige Beständigkeit | Besserer Ausdruck |
| fokus spracheweise | Fokus auf die Sprachweise | Vollständiger Ausdruck |

## 🎨 Formatierung

### formatCorrection() Ausgabe

```
📝 **Sprachkorrektur:**

**Ihr Text:**
> "Also gut, bitte mit mehr symbols"

**Korrigiert:**
> "Also gut, bitte mit mehr Symbole"

**Änderungen:**
1. 📕 "symbols" → "Symbole"
   *Deutsche Pluralform*
```

### Change Type Icons

- 📗 Grammar
- 📕 Spelling
- 📘 Style
- 📙 Capitalization

## 🔍 Beispiele

### Beispiel 1: Rechtschreibung

```typescript
const text = "Ich brauche mehr symbols für trading";
const correction = correct(text);

console.log(correction.corrected);
// "Ich brauche mehr Symbole für trading"

console.log(correction.changes);
// [{
//   type: 'spelling',
//   original: 'symbols',
//   corrected: 'Symbole',
//   explanation: 'Deutsche Pluralform'
// }]
```

### Beispiel 2: Grammatik

```typescript
const text = "bitte geben Sie mir ein Korrektur";
const correction = correct(text);

console.log(correction.corrected);
// "bitte geben Sie mir eine Korrektur"

console.log(correction.changes);
// [{
//   type: 'grammar',
//   original: 'ein Korrektur',
//   corrected: 'eine Korrektur',
//   explanation: 'Feminines Substantiv benötigt "eine"'
// }]
```

### Beispiel 3: Großschreibung

```typescript
const text = "Die ansässigkeit ist wichtig";
const correction = correct(text);

console.log(correction.corrected);
// "Die Ansässigkeit ist wichtig"

console.log(correction.changes);
// [{
//   type: 'capitalization',
//   original: 'ansässigkeit',
//   corrected: 'Ansässigkeit',
//   explanation: 'Substantive werden großgeschrieben'
// }]
```

### Beispiel 4: Stil-Verbesserung

```typescript
const text = "langfristige ansässigkeit sichern";
const correction = correct(text);

console.log(correction.corrected);
// "langfristige Beständigkeit sichern"

console.log(correction.changes);
// [{
//   type: 'style',
//   original: 'ansässigkeit',
//   corrected: 'Beständigkeit',
//   explanation: 'Passenderer Begriff für "permanence"'
// }]
```

## 🛠️ Erweiterung

### Neue Korrekturen hinzufügen

```typescript
// In useGermanCorrection.ts

const CORRECTIONS: Record<string, { 
  correct: string; 
  explanation: string; 
  type: string 
}> = {
  // Bestehende Korrekturen...
  
  // Neue hinzufügen:
  'falsch': { 
    correct: 'richtig', 
    explanation: 'Erklärung', 
    type: 'spelling' 
  },
};
```

### Neue Stil-Vorschläge

```typescript
const STYLE_SUGGESTIONS: Record<string, { 
  better: string; 
  explanation: string 
}> = {
  // Bestehende Vorschläge...
  
  // Neue hinzufügen:
  'alter ausdruck': { 
    better: 'besserer Ausdruck', 
    explanation: 'Moderner und klarer' 
  },
};
```

### Eigene Grammatik-Regeln

```typescript
// In der correct() Funktion:

corrected = corrected
  // Bestehende Regeln...
  
  // Neue Regel hinzufügen:
  .replace(/meine neue regel/gi, 'Korrektur');
```

## 🧪 Testing

```typescript
import { correctGerman } from '@/hooks/useGermanCorrection';

describe('German Correction', () => {
  test('corrects spelling', () => {
    const result = correctGerman('symbols');
    expect(result.corrected).toBe('Symbole');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].type).toBe('spelling');
  });
  
  test('corrects capitalization', () => {
    const result = correctGerman('Die ansässigkeit');
    expect(result.corrected).toContain('Ansässigkeit');
  });
  
  test('provides style suggestions', () => {
    const result = correctGerman('langfristige ansässigkeit');
    const hasStyleChange = result.changes.some(c => c.type === 'style');
    expect(hasStyleChange).toBe(true);
  });
});
```

## 📊 Statistiken

```typescript
// Korrektur-Statistiken abrufen
function getCorrectionStats(correction: GermanCorrection) {
  const stats = {
    total: correction.changes.length,
    byType: {
      grammar: 0,
      spelling: 0,
      style: 0,
      capitalization: 0
    }
  };
  
  correction.changes.forEach(change => {
    stats.byType[change.type]++;
  });
  
  return stats;
}

// Verwendung
const correction = correct(text);
const stats = getCorrectionStats(correction);
console.log(`${stats.total} Korrekturen gefunden`);
```

## 🎯 Use Cases

### 1. Chat/Messaging

```typescript
function ChatApp() {
  const { correct } = useGermanCorrection();
  
  const handleSend = (message: string) => {
    const corrected = correct(message).corrected;
    sendMessage(corrected);
  };
}
```

### 2. Form Validation

```typescript
function ContactForm() {
  const { correct } = useGermanCorrection();
  
  const validateField = (value: string) => {
    const correction = correct(value);
    if (correction.changes.length > 0) {
      return {
        valid: false,
        suggestion: correction.corrected
      };
    }
    return { valid: true };
  };
}
```

### 3. Content Editor

```typescript
function TextEditor() {
  const { correct, formatCorrection } = useGermanCorrection();
  const [content, setContent] = useState('');
  
  const showSuggestions = () => {
    const correction = correct(content);
    return formatCorrection(correction);
  };
}
```

## 🚧 Limitierungen

- ❌ Keine Kontext-sensitive Korrekturen
- ❌ Begrenzte Wortliste
- ❌ Keine komplexe Syntax-Analyse
- ❌ Keine Satzzeichen-Korrektur

## 🔮 Zukünftige Features

- [ ] API-Integration (LanguageTool, DeepL)
- [ ] Machine Learning Modell
- [ ] Kontext-basierte Korrekturen
- [ ] Dialekt-Unterstützung
- [ ] Ton-Analyse (formal/informal)
- [ ] Satzzeichen-Korrektur
- [ ] Erweiterte Grammatik-Regeln

## 📝 Best Practices

1. **Sanfte Korrekturen**
   - Zeige Vorschläge, erzwinge sie nicht
   - Lasse User entscheiden

2. **Klare UI**
   - Markiere Änderungen farblich
   - Zeige Erklärungen

3. **Performance**
   - Debounce für Echtzeit-Korrektur
   - Batch-Processing für lange Texte

4. **Privacy**
   - Alle Korrekturen lokal
   - Keine Daten an Server

## 🙏 Feedback

Der Hook ist erweiterbar! Vorschläge für neue Korrekturen sind willkommen.

**Beispiel hinzufügen:**
```typescript
// In useGermanCorrection.ts
'ihr fehler': {
  correct: 'Ihre Korrektur',
  explanation: 'Ihre Erklärung',
  type: 'grammar'
}
```
