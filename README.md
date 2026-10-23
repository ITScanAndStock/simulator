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

La commande vide toutes les tables de la base nommée par `DATABASE_URL` (celle de `.env.local`, donc `simulator-local`), sauf la liste des migrations passées et les tarifs du groupe Straumann importés (voir plus bas) : les tables restent prêtes à servir. Elle affiche la base vidée et le nombre de lignes retirées de chaque table. Elle refuse une base qui n'est pas sur cet ordinateur (`localhost`, `127.0.0.1` ou `::1`), une URL qui ne nomme pas sa base et une base que `pnpm db:migrate` n'a pas préparée (sans table `schema_migration`) : une variable `DATABASE_URL` exportée dans le terminal passe avant `.env.local` et pourrait viser la base d'un autre projet. Elle s'arrête sans rien vider si une autre transaction tient les tables plus de 5 secondes. **Le vidage est définitif** : rien ne permet de retrouver les coordonnées et les simulations retirées.

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

Deux réglages disent où tourne le simulateur et à quel fournisseur il compare les prix :

- `APP_ENV` : `development` sur cet ordinateur, `test` pour les tests de parcours, `technical`, `staging` ou `production` sur Vercel ; aucune autre valeur n'est acceptée, et `development` ou `test` sont refusés sur Vercel (repéré par la variable système `VERCEL`, posée tant que l'option « Enable access to System Environment Variables » du projet reste cochée) ;
- `REFERENCE_SUPPLIER` : le fournisseur de référence demandé à Coompy, `DoctorAI` ou `GACD`. `DoctorAI` n'est accepté qu'en `development` et en `test` : ses prix ne doivent pas être montrés au public (note juridique J9), et le bandeau « Version d'essai » de l'écran 5 n'apparaît qu'avec lui. Les tests de parcours peuvent prendre n'importe quel code fournisseur.

En `technical` et en `staging`, chaque réponse porte l'en-tête `X-Robots-Tag: noindex`, qui tient les moteurs de recherche à l'écart ; la production n'en porte pas.

Tous les réglages sont contrôlés au démarrage du serveur. Si l'un est faux, le serveur démarre mais répond une erreur 500 à chaque requête, et son journal nomme le réglage en cause. Pour contrôler les réglages sans lancer le simulateur, à partir des variables de l'environnement où elle tourne :

```sh
pnpm settings:check
```

Contre un environnement Vercel, avec la CLI Vercel reliée au projet, `vercel env run` passe les variables de cet environnement à la commande sans les écrire sur le disque (`-e` accepte `development`, `preview` ou `production`) :

```sh
vercel env run -e production -- pnpm settings:check
```

Deux limites, tirées de la documentation de la CLI (août 2026) et pas encore éprouvées sur le projet Vercel de CSP : `vercel env run` ne vise pas un environnement personnalisé (si `staging` en est un, seul le démarrage du serveur le contrôle), et Vercel ne rend pas la valeur des variables de type Secret, qui risquent d'être lues comme absentes. `APP_ENV` et `REFERENCE_SUPPLIER` sont donc enregistrées en type Config, pour que leur contrôle compte ; pour les variables Secret (`DATABASE_URL`, `COOMPY_CLIENT_SECRET`), c'est le démarrage du serveur qui fait foi.

Une ligne dont l'économie dépasse un seuil est écartée du total et laissée à un conseiller (« À vérifier par un conseiller ») : un tel écart signale plus souvent un mauvais rapprochement (autre conditionnement, autre produit) qu'une vraie économie. Le seuil vaut 50 % ; `SUSPICIOUS_SAVING_PERCENT` le change sans toucher au code.

L'écran 5 se règle aussi sans toucher au code :

- `AVERAGE_SAVING_EUROS` : l'économie moyenne des affiliés, en euros entiers (« En moyenne, nos affiliés économisent 26 500 € par an ») ; sans valeur, la phrase n'est pas affichée. Le chiffre attend encore sa source chez CSP avant la mise en ligne ;
- `CALENDLY_URL` : le lien du bouton « Prendre rendez-vous avec un conseiller », par défaut https://calendly.com/clubsantepremium-rdvoffert/1h.

Les lignes d'une facture Straumann, Anthogyr ou Neodent ne passent pas par Coompy : elles sont chiffrées au prix de l'accord CSP, à partir des tarifs du groupe. Ces tarifs et l'accord sont confidentiels et restent hors du dépôt. Les quatre tarifs (`catalogue_straumann.pdf`, `catalogue_anthogyr.pdf`, `catalogue_neodent.pdf`, `catalogue_biomateriaux.pdf`) se rangent dans un dossier nommé dans `.env.local`, puis s'importent dans la base :

```sh
STRAUMANN_PRICE_LISTS_DIR=/chemin/vers/les/tarifs
```

```sh
pnpm price-lists:import
```

La commande lit les quatre tarifs avant d'écrire quoi que ce soit : si l'un manque ou ne se lit pas, elle s'arrête et la base garde l'import précédent. Sinon elle remplace tout l'import précédent et affiche le nombre de références et l'année de chaque tarif. Elle se relance à l'arrivée d'un nouveau tarif. La référence d'une ligne est cherchée telle quelle (majuscules et espaces compris) ; absente des tarifs, la ligne est « À étudier », comme une ligne ClearCorrect. Une référence que deux tarifs du groupe portent prend la remise du tarif de l'émetteur de la facture, ou la plus petite des remises si l'émetteur ne la porte pas.

L'accord se règle dans `.env.local`, jamais dans le dépôt :

- `STRAUMANN_GROUP_DISCOUNTS` : la remise structurelle de chaque gamme, en pourcentage, sous la forme `straumann=…,anthogyr=…,neodent=…,biomaterials=…,xenograft=…` (XenoGraft a sa propre gamme ; XenoFlex suit les biomatériaux) ;
- `STRAUMANN_GROUP_REBATE_TIERS` : les paliers de la remise de fin d'année, sous la forme `implants=pourcentage` par ordre croissant, chacun valant à partir de ce nombre d'implants commandés par an (par exemple `20=1,61=2.5` : 1 % de 20 à 60 implants, 2,5 % à partir de 61) ; en dessous du premier palier, ou sans volume déclaré, il n'y a pas de remise. Elle porte sur le prix catalogue des gammes Straumann, Anthogyr et Neodent, jamais sur les biomatériaux.

Tant que la question du volume d'implants n'est pas posée (ticket 24), aucune remise de fin d'année n'est comptée.

L'écran 3 refuse, avant tout envoi, un fichier plus lourd que `MAX_INVOICE_MEGABYTES` mégaoctets (4 par défaut, en entier de 1 à 9 : le serveur refuse tout envoi au-delà de 10 Mo).

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

Sans cette variable, leurs tests sont sautés. De même, les tests des vrais tarifs du groupe Straumann ne tournent que si `STRAUMANN_PRICE_LISTS_DIR` est renseignée ; les faux tarifs du dépôt (`test-price-lists/`, écrits par `node scripts/write-fake-price-lists.mts`) reprennent la mise en page de chacun avec des références et des prix inventés.

Pour lancer les tests de parcours dans le navigateur (Playwright), installer une fois le navigateur Chromium :

```sh
pnpm exec playwright install chromium
```

puis :

```sh
pnpm test:e2e
```

La commande migre la base `simulator-e2e` (`E2E_DATABASE_URL`, obligatoire, sur cet ordinateur et différente de celle de `DATABASE_URL` : sinon elle s'arrête avant de rien écrire), construit le simulateur en production, le démarre sur http://127.0.0.1:3100 branché sur cette base le temps des tests, puis l'arrête. Le port 3100 doit être libre. Le dernier test vide la base `simulator-e2e` avec `pnpm db:empty`, une fois tous les autres terminés.
