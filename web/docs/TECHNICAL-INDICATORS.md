# Technical Indicators - Chartanalyse

Vollständige Dokumentation aller verfügbaren technischen Indikatoren.

## 📊 Verfügbare Indikatoren

### Moving Averages

#### **SMA - Simple Moving Average**
Einfacher gleitender Durchschnitt.

```typescript
sma(values: number[], period: number): number[]
```

**Parameter:**
- `values`: Preisdaten (meist Close-Prices)
- `period`: Zeitraum (Standard: 20)

**Verwendung:**
- Trend-Erkennung
- Support/Resistance-Levels
- Trading-Signale (Golden/Death Cross)

**Im Chart:**
- Farbe: Gelb (#fbbf24)
- Darstellung: Durchgehende Linie

---

#### **EMA - Exponential Moving Average**
Exponentiell gewichteter gleitender Durchschnitt.

```typescript
ema(values: number[], period: number): number[]
```

**Parameter:**
- `values`: Preisdaten
- `period`: Zeitraum (Standard: 21)

**Unterschied zu SMA:**
- Reagiert schneller auf Preisänderungen
- Gewichtet neuere Daten stärker
- Besser für kurzfristige Trends

**Im Chart:**
- Farbe: Lila (#a78bfa)
- Darstellung: Durchgehende Linie

**Formel:**
```
EMA = Price × K + EMA(previous) × (1 - K)
wobei K = 2 / (period + 1)
```

---

### Oscillators

#### **RSI - Relative Strength Index**
Momentum-Indikator für überkaufte/überverkaufte Bedingungen.

```typescript
rsi(closes: number[], period: number = 14): number[]
```

**Parameter:**
- `closes`: Schlusskurse
- `period`: Berechnungszeitraum (Standard: 14)

**Interpretation:**
- **> 70**: Überkauft (Potentieller Verkauf)
- **30-70**: Neutral
- **< 30**: Überverkauft (Potentieller Kauf)

**Im Chart:**
- Farbe: Cyan (#22d3ee)
- Darstellung: Gestrichelte Linie
- Separates Panel (0-100 Scale)

**Trading-Signale:**
- Divergenzen mit Preis
- Overbought/Oversold Crossings
- Centerline (50) Crosses

---

#### **Stochastic Oscillator**
Momentum-Indikator, der Schlusskurs mit Preisspanne vergleicht.

```typescript
stochastic(candles: Candle[], kPeriod: number = 14, dPeriod: number = 3)
```

**Parameter:**
- `candles`: OHLC-Daten
- `kPeriod`: Zeitraum für %K (Standard: 14)
- `dPeriod`: Zeitraum für %D (Standard: 3)

**Komponenten:**
- **%K**: Fast Line (schnelle Linie)
- **%D**: Slow Line (gleitender Durchschnitt von %K)

**Interpretation:**
- **> 80**: Überkauft
- **< 20**: Überverkauft
- **%K kreuzt %D**: Trading-Signal

**Im Chart:**
- Farbe: Orange (#fb923c)
- %K: Durchgehende Linie
- %D: Gestrichelt
- Separates Panel

**Formel:**
```
%K = [(C - L14) / (H14 - L14)] × 100
wobei:
C = Aktueller Schlusskurs
L14 = Niedrigster Tief der letzten 14 Perioden
H14 = Höchster Hoch der letzten 14 Perioden
```

---

### Trend Indicators

#### **MACD - Moving Average Convergence Divergence**
Trend-Following Momentum-Indikator.

```typescript
macd(closes: number[], fast: number = 12, slow: number = 26, signalPeriod: number = 9)
```

**Parameter:**
- `fast`: Schnelle EMA (Standard: 12)
- `slow`: Langsame EMA (Standard: 26)
- `signalPeriod`: Signal-Linie (Standard: 9)

**Komponenten:**
- **MACD Line**: Differenz zwischen Fast und Slow EMA
- **Signal Line**: EMA der MACD Line
- **Histogram**: Differenz MACD - Signal

**Trading-Signale:**
- **MACD kreuzt Signal**: Kauf/Verkauf-Signal
- **Histogram**: Momentum-Stärke
- **Divergenzen**: Trendumkehr-Warnung

**Im Chart:**
- Farbe: Pink (#f472b6)
- Darstellung: Gestrichelt
- Separates Panel

---

#### **ADX - Average Directional Index**
Misst Trend-Stärke (nicht Richtung).

```typescript
adx(candles: Candle[], period: number = 14): number[]
```

**Parameter:**
- `candles`: OHLC-Daten
- `period`: Berechnungszeitraum (Standard: 14)

**Interpretation:**
- **< 20**: Schwacher/kein Trend
- **20-25**: Entwickelnder Trend
- **25-50**: Starker Trend
- **50-75**: Sehr starker Trend
- **> 75**: Extrem starker Trend

**Im Chart:**
- Farbe: Grün (#34d399)
- Darstellung: Gestrichelt
- Werte: 0-100

**Verwendung:**
- Trend-Stärke messen
- Range vs Trending Markets
- Filter für Trend-Strategien

---

### Volume Indicators

#### **VWAP - Volume-Weighted Average Price**
Volumengewichteter Durchschnittspreis.

```typescript
vwap(candles: Candle[]): number[]
```

**Berechnung:**
```
VWAP = Σ(Typical Price × Volume) / Σ(Volume)
wobei Typical Price = (High + Low + Close) / 3
```

**Verwendung:**
- Intraday-Trading
- Institutionelle Benchmark
- Support/Resistance
- Fair Value Indicator

**Im Chart:**
- Farbe: Lila (#c084fc)
- Darstellung: Durchgehende Linie
- Kumulative Berechnung

**Trading-Strategie:**
- Preis über VWAP: Bullish
- Preis unter VWAP: Bearish
- VWAP als Dynamic Support/Resistance

---

### Volatility Indicators

#### **Bollinger Bands**
Volatilitäts-Bänder um gleitenden Durchschnitt.

```typescript
bollingerBands(closes: number[], period: number = 20, stdDev: number = 2)
```

**Parameter:**
- `period`: SMA-Zeitraum (Standard: 20)
- `stdDev`: Standardabweichungen (Standard: 2)

**Komponenten:**
- **Middle Band**: SMA(20)
- **Upper Band**: SMA + (2 × StdDev)
- **Lower Band**: SMA - (2 × StdDev)

**Interpretation:**
- **Preis an Upper Band**: Überkauft
- **Preis an Lower Band**: Überverkauft
- **Squeeze**: Niedrige Volatilität, Breakout bevorsteht
- **Expansion**: Hohe Volatilität

**Im Chart:**
- Farbe: Türkis (#2dd4bf)
- Middle: Durchgehend
- Upper/Lower: Gestrichelt

**Trading-Strategien:**
1. **Bollinger Bounce**: Mean Reversion bei Bands
2. **Bollinger Squeeze**: Breakout-Trading
3. **Walking the Bands**: Starker Trend

---

## 🎮 Im Spiel verwenden

### Indikator-Auswahl

Jede Runde bekommt 2-3 zufällige Indikatoren:

```typescript
// In roundSetup.ts
const indicators = [
  { kind: "sma", period: 20, color: "#fbbf24", label: "SMA(20)" },
  { kind: "rsi", period: 14, color: "#22d3ee", label: "RSI(14)" },
  { kind: "macd", period: 12, color: "#f472b6", label: "MACD" }
];
```

### Chart-Darstellung

Indikatoren werden automatisch gerendert:
- **Main Chart**: SMA, EMA, Bollinger Bands, VWAP
- **Oscillator Panel**: RSI, Stochastic, MACD, ADX

### Farb-Schema

| Indikator | Farbe | Hex |
|-----------|-------|-----|
| SMA | Gelb | #fbbf24 |
| EMA | Lila | #a78bfa |
| RSI | Cyan | #22d3ee |
| MACD | Pink | #f472b6 |
| Bollinger | Türkis | #2dd4bf |
| Stochastic | Orange | #fb923c |
| ADX | Grün | #34d399 |
| VWAP | Lila | #c084fc |

## 📐 Technische Details

### Berechnung

Alle Indikatoren werden in `/src/lib/sim/indicators.ts` berechnet:

```typescript
import { 
  sma, ema, rsi, macd, 
  bollingerBands, stochastic, 
  adx, vwap 
} from '@/lib/sim/indicators';

// Beispiel: RSI berechnen
const closes = candles.map(c => c.close);
const rsiValues = rsi(closes, 14);

// Letzter RSI-Wert
const currentRSI = rsiValues[rsiValues.length - 1];
```

### Chart Integration

Indikatoren werden in `/src/lib/game/chartOverlays.ts` integriert:

```typescript
export function buildOverlays(
  candles: Candle[], 
  indicators: ChartIndicator[]
): OverlayLine[] {
  const lines: OverlayLine[] = [];
  
  for (const ind of indicators) {
    if (ind.kind === "sma") {
      lines.push({
        label: ind.label,
        color: ind.color,
        values: sma(closes, ind.period)
      });
    }
    // ... weitere Indikatoren
  }
  
  return lines;
}
```

### Performance

Alle Indikatoren sind optimiert:
- ✅ O(n) Zeitkomplexität
- ✅ Minimaler Memory Footprint
- ✅ Real-time Berechnung
- ✅ Keine unnötigen Re-renders

## 📚 Trading-Strategien

### Moving Average Crossover

```typescript
// Golden Cross (Bullish)
if (sma50[i] > sma200[i] && sma50[i-1] <= sma200[i-1]) {
  // BUY Signal
}

// Death Cross (Bearish)
if (sma50[i] < sma200[i] && sma50[i-1] >= sma200[i-1]) {
  // SELL Signal
}
```

### RSI Divergence

```typescript
// Bullish Divergence
// Preis macht tieferes Tief, RSI macht höheres Tief
if (price[i] < price[prev] && rsi[i] > rsi[prev]) {
  // Potentieller Aufwärtstrend
}
```

### Bollinger Band Squeeze

```typescript
// Squeeze Detection
const bandwidth = (upper - lower) / middle;
if (bandwidth < threshold) {
  // Breakout steht bevor
}
```

### MACD + RSI Kombination

```typescript
// Starkes Kauf-Signal
if (macdLine > macdSignal && rsi < 30) {
  // Überverkauft + Momentum steigt
  // BUY
}
```

## 🎓 Best Practices

### Indikator-Kombination

1. **Trend + Momentum**:
   - SMA/EMA + RSI
   - ADX + MACD

2. **Trend + Volatilität**:
   - SMA + Bollinger Bands
   - EMA + ATR

3. **Momentum + Oscillator**:
   - RSI + Stochastic
   - MACD + ADX

### Timeframe-Anpassung

| Timeframe | Empfohlene Periods |
|-----------|-------------------|
| 5m | SMA(9), RSI(7) |
| 15m | SMA(12), RSI(9) |
| 1H | SMA(20), RSI(14) |
| 4H | SMA(50), RSI(21) |
| 1D | SMA(200), RSI(14) |

### Fehler vermeiden

❌ **Nicht tun:**
- Zu viele Indikatoren gleichzeitig
- Nur auf einen Indikator verlassen
- Parameter ständig ändern
- Signale ignorieren

✅ **Empfohlen:**
- 2-3 komplementäre Indikatoren
- Mehrfache Bestätigung
- Konsequente Parameter
- Risk Management

## 🔧 Eigene Indikatoren hinzufügen

### 1. Implementierung in indicators.ts

```typescript
export function myIndicator(
  candles: Candle[], 
  period: number
): number[] {
  const out = new Array<number>(candles.length).fill(NaN);
  
  // Ihre Berechnung hier
  
  return out;
}
```

### 2. Type Definition in roundSetup.ts

```typescript
export type IndicatorKind = 
  | "sma" | "ema" | "rsi" | "macd" 
  | "bollinger" | "stochastic" | "adx" | "vwap"
  | "myIndicator"; // Hinzufügen
```

### 3. Chart Integration in chartOverlays.ts

```typescript
else if (ind.kind === "myIndicator") {
  const values = myIndicator(closed, ind.period);
  lines.push({ 
    label: ind.label, 
    color: ind.color, 
    values 
  });
}
```

### 4. Indicator Definition

```typescript
const INDICATOR_DEFS = [
  // ... bestehende
  { 
    kind: "myIndicator", 
    basePeriod: 20, 
    color: "#ff6b6b", 
    name: "My Indicator" 
  },
];
```

## 📖 Weitere Ressourcen

- [Investopedia - Technical Indicators](https://www.investopedia.com/terms/t/technicalindicator.asp)
- [TradingView - Indicators](https://www.tradingview.com/scripts/)
- [StockCharts - ChartSchool](https://school.stockcharts.com/)
