# Epic Games Auto-Acquire Script

Script Playwright pour acquérir automatiquement tous les jeux gratuits d'Epic Games Store.

## Installation

```bash
pnpm install
```

## Étape 1: Sauvegarder ton authentification

La première fois, tu dois te connecter à Epic Games et sauvegarder tes cookies:

```bash
pnpm run save-auth
```

Un navigateur va s'ouvrir. **Connecte-toi à Epic Games**, puis ferme le navigateur. Tes cookies seront sauvegardés dans `./auth/state.json`.

## Étape 2: Lancer l'acquisition

Une fois authentifié, tu peux lancer le script:

```bash
pnpm start
```

Le script va:
1. ✅ Extraire tous les jeux de toutes les pages
2. ✅ Filtrer les jeux déjà acquis
3. ✅ Acquérir automatiquement tous les restants (en mode non-headless)
4. ✅ Afficher la progression en temps réel

## Reprise

Le script sauvegarde sa progression dans `progress.json` (gitignored). Si le script est interrompu, relance-le simplement — il reprendra là où il s'était arrêté sans re-acquérir les jeux déjà traités.

## Fichiers

- `save_auth.js` - Sauvegarde l'authentification (à exécuter une fois)
- `epic_games_acquire.js` - Script principal d'acquisition
- `auth/state.json` - Contient tes cookies (généré après save-auth, gitignored)
- `progress.json` - Sauvegarde de progression (généré automatiquement, gitignored)
