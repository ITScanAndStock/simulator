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

La commande n'applique que les migrations pas encore passées ; rien n'est migré au démarrage du simulateur. Elle refuse une base qui contient déjà des tables sans la liste des migrations du simulateur (table `schema_migration`) : c'est la base d'un autre projet, et elle n'y crée rien. Une base vide est acceptée.

Pour vider la base, par exemple après des essais :

```sh
pnpm db:empty
```

La commande vide toutes les tables de la base nommée par `DATABASE_URL` (celle de `.env.local`, donc `simulator-local`), sauf la liste des migrations passées : les tables restent prêtes à servir. Elle affiche la base vidée et le nombre de lignes retirées de chaque table. Elle refuse une base qui n'est pas sur cet ordinateur (`localhost`, `127.0.0.1` ou `::1`), une URL qui ne nomme pas sa base et une base que `pnpm db:migrate` n'a pas préparée (sans table `schema_migration`) : une variable `DATABASE_URL` exportée dans le terminal passe avant `.env.local` et pourrait viser la base d'un autre projet. Elle s'arrête sans rien vider si une autre transaction tient les tables plus de 5 secondes. **Le vidage est définitif** : rien ne permet de retrouver les coordonnées et les simulations retirées.

Pour lancer le simulateur :

```sh
pnpm dev
```

Le simulateur s'ouvre sur http://127.0.0.1:3000 et ne répond que sur cet ordinateur : les autres appareils du réseau ne peuvent pas l'ouvrir. `pnpm start` fait de même.

Les prix de référence viennent de Coompy (`coompy-api`), lancé sur cet ordinateur. Le simulateur interroge sa recherche de produits avec le jeton d'un client de service Keycloak (`csp-simulator`, rôle `SIMULATOR`). Il faut le lancer depuis une branche qui porte `matchedRef` (`staging` en octobre 2026), avec le JDK 21 et le profil `local`, le crawler restant éteint :

```sh
JAVA_HOME=/chemin/vers/jdk-21 mvn -DskipTests spring-boot:run -Dspring-boot.run.profiles=local
```

puis renseigner dans `.env.local` :

- `COOMPY_API_URL` : `http://localhost:8083/api` ;
- `COOMPY_TOKEN_URL` : l'adresse des jetons du realm `scan-and-stock` ;
- `COOMPY_CLIENT_ID` et `COOMPY_CLIENT_SECRET` : le client de service.

Les tests de l'adaptateur Coompy rejouent des réponses de `GET /products` enregistrées une fois (`test-coompy/`). Pour les enregistrer de nouveau, Coompy lancé :

```sh
pnpm coompy:record
```

Les prix Doctor AI ne doivent pas quitter cet ordinateur : la commande remplace chaque prix par un prix inventé et retire les libellés, marques, liens et images avant d'écrire les fichiers.

Pour lancer les tests :

```sh
pnpm test
```

Les vraies factures ne sont jamais dans le dépôt : seuls leurs résultats attendus y sont (`test-invoices/real/expected.ts`, sans nom ni adresse). Pour les lire aussi, indiquer leur dossier dans `.env.local` :

```sh
REAL_INVOICES_DIR=/chemin/vers/les/factures
```

Sans cette variable, leurs tests sont sautés.

Pour lancer les tests de parcours dans le navigateur (Playwright), installer une fois le navigateur Chromium :

```sh
pnpm exec playwright install chromium
```

puis :

```sh
pnpm test:e2e
```

La commande migre la base `simulator-e2e` (`E2E_DATABASE_URL`, obligatoire, sur cet ordinateur et différente de celle de `DATABASE_URL` : sinon elle s'arrête avant de rien écrire), construit le simulateur en production, le démarre sur http://127.0.0.1:3100 branché sur cette base le temps des tests, puis l'arrête. Le port 3100 doit être libre. Le dernier test vide la base `simulator-e2e` avec `pnpm db:empty`, une fois tous les autres terminés.
