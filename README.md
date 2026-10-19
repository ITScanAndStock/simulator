# Simulateur d'économies Club Santé Premium

Le simulateur montre à un cabinet dentaire combien il aurait économisé en achetant aux prix négociés par Club Santé Premium (CSP).

Le praticien dépose les factures de ses fournisseurs. Le simulateur compare chaque produit facturé au prix CSP du même produit et affiche l'économie, en euros et en pourcentage, sur les produits qu'il a pu comparer.
Le praticien peut ensuite prendre rendez-vous avec un conseiller CSP pour en obtenir le détail.

Le simulateur s'adresse aux cabinets déjà affiliés à CSP, aux utilisateurs de Scan&Stock et aux cabinets qui ne connaissent pas encore CSP.

## Où en est le projet

Le simulateur est en cours de réalisation. La première version tourne en local : elle sert à l'essayer sur de vraies factures, avec un conseiller CSP, avant d'ouvrir le simulateur au public.

## Lancer en local

Il faut Node 24.22.0 (voir `.nvmrc`) et pnpm, dans la version fixée par `package.json` (Corepack la fournit).

```sh
pnpm install
```

Le simulateur garde les coordonnées et les simulations dans une base PostgreSQL locale (PostgreSQL 18). Il en faut deux : `simulator-local` pour le simulateur, `simulator-e2e` pour les tests de parcours, que ceux-ci écrivent sans toucher à la première. Pour les créer :

```sh
createdb simulator-local
createdb simulator-e2e
```

Copier ensuite `.env.example` en `.env.local` (ce fichier n'est pas versionné) et y mettre l'utilisateur et le mot de passe de votre PostgreSQL :

- `DATABASE_URL` : la base `simulator-local` ;
- `E2E_DATABASE_URL` : la base `simulator-e2e`.

Puis créer les tables, une fois, et après chaque nouvelle migration (fichiers de `db/migrations/`) :

```sh
pnpm db:migrate
```

La commande n'applique que les migrations pas encore passées ; rien n'est migré au démarrage du simulateur.

Pour lancer le simulateur :

```sh
pnpm dev
```

Le simulateur s'ouvre sur http://localhost:3000.

Pour lancer les tests :

```sh
pnpm test
```

Pour lancer les tests de parcours dans le navigateur (Playwright), installer une fois le navigateur Chromium :

```sh
pnpm exec playwright install chromium
```

puis :

```sh
pnpm test:e2e
```

La commande migre la base `simulator-e2e` (`E2E_DATABASE_URL`, obligatoire), construit le simulateur en production, le démarre sur http://localhost:3100 branché sur cette base le temps des tests, puis l'arrête. Le port 3100 doit être libre.
