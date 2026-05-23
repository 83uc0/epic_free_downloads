# Epic Free Downloads

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Playwright-1.40%2B-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![pnpm](https://img.shields.io/badge/pnpm-required-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/83uc0/epic_free_downloads)

> Acquiert automatiquement tous les jeux gratuits de l'Epic Games Store via Playwright — sans intervention manuelle après la première connexion.

---

## Table des matières

- [Présentation](#présentation)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Architecture](#architecture)
- [Sécurité](#sécurité)

---

## Présentation

Le script parcourt toutes les pages du catalogue gratuit d'Epic Games (~500+ jeux), filtre ceux déjà possédés, et clique sur "Acquérir" pour chacun des restants. La progression est sauvegardée localement — une interruption ne repart pas de zéro.

### Fonctionnalités

- Extraction automatique de l'intégralité du catalogue gratuit (pagination complète)
- Détection et saut des jeux déjà acquis
- Reprise après interruption sans doublon
- Progression affichée en temps réel dans le terminal

---

## Prérequis

- [Node.js](https://nodejs.org) >= 18.x
- [pnpm](https://pnpm.io) >= 8.x
- Un compte Epic Games

---

## Installation

```bash
git clone https://github.com/83uc0/epic_free_downloads.git
cd epic_free_downloads
pnpm install
```

---

## Utilisation

### Étape 1 — Sauvegarder la session (une seule fois)

```bash
pnpm run save-auth
```

Un navigateur s'ouvre sur le store Epic Games. Connecte-toi, puis **ferme la fenêtre**. La session est sauvegardée dans `auth/state.json`.

> La fenêtre se ferme automatiquement après 90 secondes — assure-toi de te connecter avant.

### Étape 2 — Lancer l'acquisition

```bash
pnpm start
```

Le script parcourt toutes les pages, filtre les jeux déjà acquis, et clique sur "Acquérir" pour les restants.

**Reprise automatique** : si le script est interrompu, relance `pnpm start` — il reprend là où il s'était arrêté grâce à `progress.json`.

---

## Architecture

```
epic_free_downloads/
├── save_auth.js            # Ouvre le navigateur pour se connecter et sauvegarder la session
├── epic_games_unified.js   # Script principal : extraction du catalogue + acquisition
├── epic_games_acquire.js   # Script d'acquisition seul (sans extraction)
├── auth/
│   └── state.json          # Session Playwright (gitignored)
├── progress.json           # État de reprise (gitignored)
└── package.json
```

---

## Sécurité

- **`auth/state.json`** contient tes cookies Epic Games — ne le partage jamais et ne le commite pas (déjà dans `.gitignore`)
- **`progress.json`** ne contient que des slugs de jeux — aucune donnée sensible
- Le script utilise un `userAgent` standard pour éviter les blocages ; il ne contourne aucun mécanisme de paiement (jeux gratuits uniquement)
