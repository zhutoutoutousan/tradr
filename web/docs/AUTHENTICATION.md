# Authentication & Leaderboard System

Vollständiges Benutzer-Authentifizierungssystem mit globalem Ranking.

## 🎯 Features

### Authentication
- ✅ **Sign Up** - Neue Benutzer registrieren
- ✅ **Sign In** - Bestehende Benutzer anmelden
- ✅ **Sign Out** - Sicher abmelden
- ✅ **Profile Management** - Benutzerprofil verwalten
- ✅ **Username Validation** - Benutzername-Verfügbarkeit prüfen

### User Profiles
- ✅ **ELO Rating System** - Skill-basiertes Ranking
- ✅ **Game Statistics** - Spiele, Siege, Profite
- ✅ **Personal Bests** - Beste Ergebnisse tracken
- ✅ **Achievement Tracking** - Erfolge freischalten
- ✅ **Last Played** - Letzte Aktivität

### Global Leaderboard
- ✅ **Top 1000 Players** - Weltweites Ranking
- ✅ **ELO-based Ranking** - Faires Skill-System
- ✅ **Win Rate Display** - Sieg-Statistiken
- ✅ **Auto-Refresh** - Automatische Aktualisierung
- ✅ **Minimum Games** - Mindestens 5 Spiele erforderlich

## 🏗️ Architektur

### Datenbank Schema

```sql
-- User Profiles
user_profiles
  - id (uuid, references auth.users)
  - username (unique)
  - display_name
  - elo_rating (default 1200)
  - best_elo
  - total_games
  - total_wins
  - total_profit
  - best_return_pct
  - best_single_profit
  - created_at
  - updated_at
  - last_played_at

-- Game History
user_game_history
  - id (uuid)
  - user_id (references user_profiles)
  - played_at
  - mode (solo/multiplayer)
  - market_id
  - rank
  - return_pct
  - profit
  - elo_before
  - elo_after
  - elo_change
  - review_json

-- Leaderboard
global_leaderboard
  - rank
  - user_id
  - username
  - display_name
  - elo_rating
  - total_games
  - total_wins
  - win_rate

-- Achievements
user_achievements
  - user_id
  - achievement_id
  - unlocked_at
  - game_id
```

### Row Level Security (RLS)

Alle Tabellen sind mit RLS gesichert:
- ✅ User können nur ihre eigenen Profile bearbeiten
- ✅ Alle können Profile und Leaderboard lesen
- ✅ User können nur ihre eigene Game-History sehen
- ✅ User können nur ihre eigenen Achievements verwalten

## 🚀 Verwendung

### Auth Service

```typescript
import { authService } from '@/lib/auth/supabase-auth';

// Sign Up
const { user, session, error } = await authService.signUp({
  email: 'user@example.com',
  password: 'secure123',
  username: 'trader123',
  displayName: 'Pro Trader'
});

// Sign In
const { user, session, error } = await authService.signIn({
  email: 'user@example.com',
  password: 'secure123'
});

// Sign Out
await authService.signOut();

// Get Profile
const profile = await authService.getUserProfile(userId);

// Update Profile
await authService.updateUserProfile(userId, {
  display_name: 'New Name',
  show_in_leaderboard: true
});

// Check Username
const available = await authService.isUsernameAvailable('newuser');
```

### useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, profile, loading, isAuthenticated } = useAuth();
  
  if (loading) return <Loading />;
  
  if (!isAuthenticated) {
    return <AuthModal />;
  }
  
  return (
    <div>
      <h1>Welcome {profile?.display_name}!</h1>
      <p>ELO: {profile?.elo_rating}</p>
      <p>Games: {profile?.total_games}</p>
    </div>
  );
}
```

### Auth Modal

```typescript
import { AuthModal } from '@/components/auth/AuthModal';

function Header() {
  const [showAuth, setShowAuth] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowAuth(true)}>
        Anmelden
      </button>
      
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode="signin" // or "signup"
      />
    </>
  );
}
```

### User Menu

```typescript
import { UserMenu } from '@/components/UserMenu';

function Header() {
  return (
    <header>
      <Logo />
      <Nav />
      <UserMenu /> {/* Shows auth state */}
    </header>
  );
}
```

### Global Leaderboard

```typescript
import { GlobalLeaderboard } from '@/components/leaderboard/GlobalLeaderboard';

function LeaderboardPage() {
  return (
    <div>
      <h1>Top Players</h1>
      <GlobalLeaderboard />
    </div>
  );
}
```

## 📊 ELO Rating System

### Wie funktioniert ELO?

Das ELO-System berechnet Skill-basierte Ratings:

1. **Start-Rating**: 1200 ELO für neue Spieler
2. **Änderung**: ±10-30 Punkte pro Spiel
3. **Basis**: Rang in der Runde (1. Platz = mehr ELO)
4. **Fair**: Stärkere Gegner = mehr Punkte bei Sieg

### ELO-Berechnung

```typescript
// Nach jedem Spiel:
const eloDelta = computeEloDelta({
  playerRank: 1,           // Dein Platz
  totalPlayers: 4,         // Anzahl Spieler
  playerElo: 1200,         // Dein aktuelles ELO
  opponentsElo: [1250, 1180, 1300] // Gegner-ELOs
});

// Neues ELO
const newElo = currentElo + eloDelta;
```

### ELO-Kategorien

| ELO Range | Kategorie | Beschreibung |
|-----------|-----------|--------------|
| < 1000 | Anfänger | Lerne die Grundlagen |
| 1000-1200 | Bronze | Solide Basis |
| 1200-1400 | Silber | Gute Trader |
| 1400-1600 | Gold | Sehr gut |
| 1600-1800 | Platin | Experte |
| 1800+ | Diamant | Elite |

## 🏆 Leaderboard-Regeln

### Teilnahme-Voraussetzungen

- ✅ Mindestens **5 Spiele** gespielt
- ✅ **show_in_leaderboard** aktiviert (Standard)
- ✅ Gültiges Benutzerkonto

### Ranking-Kriterien

1. **Primär**: ELO-Rating (höher = besser)
2. **Sekundär**: Total Wins (bei ELO-Gleichstand)
3. **Tertiär**: Total Games (bei weiterer Gleichheit)

### Aktualisierung

- **Echtzeit**: Nach jedem Spiel
- **Auto-Refresh**: Bei ELO-Änderung > ±10
- **Manuell**: Refresh-Button im UI

### Top 3 Badges

- 🥇 **1. Platz** - Gold Medal
- 🥈 **2. Platz** - Silver Medal
- 🥉 **3. Platz** - Bronze Medal

## 🔒 Sicherheit

### Password Hashing
- ✅ Supabase Auth nutzt bcrypt
- ✅ Mindestens 6 Zeichen
- ✅ Server-side Validierung

### Row Level Security
- ✅ Alle Tabellen geschützt
- ✅ User können nur eigene Daten ändern
- ✅ Öffentliche Daten nur lesbar

### Session Management
- ✅ JWT-based Sessions
- ✅ Automatisches Token-Refresh
- ✅ Sichere Cookies

## 📝 API-Referenz

### authService

```typescript
interface AuthService {
  signUp(data: SignUpData): Promise<AuthResult>;
  signIn(data: SignInData): Promise<AuthResult>;
  signOut(): Promise<{ error: AuthError | null }>;
  getSession(): Promise<{ session: Session | null }>;
  getUser(): Promise<{ user: User | null }>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void>;
  isUsernameAvailable(username: string): Promise<boolean>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}
```

### UserProfile

```typescript
interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  elo_rating: number;
  best_elo: number;
  total_games: number;
  total_wins: number;
  total_profit: number;
  best_return_pct: number;
  best_single_profit: number;
  created_at: string;
  last_played_at: string | null;
  preferred_language: 'de' | 'en';
  show_in_leaderboard: boolean;
}
```

## 🧪 Testing

### Auth Flow Testen

```bash
# 1. Registrierung
POST /api/auth/signup
{
  "email": "test@example.com",
  "password": "test123",
  "username": "testuser"
}

# 2. Anmeldung
POST /api/auth/signin
{
  "email": "test@example.com",
  "password": "test123"
}

# 3. Profil abrufen
GET /api/auth/profile

# 4. Abmelden
POST /api/auth/signout
```

### Leaderboard Testen

```javascript
// In Browser Console:
import { supabase } from '@/lib/supabase';

// Leaderboard laden
const { data } = await supabase
  .from('global_leaderboard')
  .select('*')
  .limit(10);

console.table(data);
```

## 🚧 Troubleshooting

### "Supabase not configured"
→ Setze `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Username already taken"
→ Username muss eindeutig sein, wähle einen anderen

### "Leaderboard leer"
→ Spiele mindestens 5 Runden, dann erscheinst du

### "ELO ändert sich nicht"
→ Prüfe ob `user_game_history` Einträge hat
→ Trigger sollte ELO automatisch aktualisieren

## 🎯 Migration Anwenden

```bash
# Supabase CLI
supabase db push

# Oder manuell in Supabase Dashboard:
# SQL Editor → migration 003_user_profiles_and_leaderboard.sql ausführen
```

## 🔮 Zukünftige Features

- [ ] Avatar Upload
- [ ] Friend System
- [ ] Private Challenges
- [ ] Team Rankings
- [ ] Season Rankings
- [ ] Leaderboard History
- [ ] Achievement Badges
- [ ] Profile Customization
