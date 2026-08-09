# Market Watch — PWA V1

PWA légère, autonome et locale pour surveiller crypto + actions.

## V1 incluse

- Cours et variations
- Seuil minimum / maximum personnalisables directement sur les cartes
- Cadre rouge si le cours est sous le mini
- Cadre vert si le cours est au-dessus du maxi
- Aucun cadre si le cours est entre les deux seuils
- Mode démonstration : valeurs simulées toutes les 5 secondes
- Graphiques
- Watchlist crypto et actions
- Alertes de dépassement de seuil
- Actualités associées (jeu de données démo dans cette version)
- Calendrier d'événements importants (jeu de données démo)
- Score d'intérêt automatique
- Stockage local
- Installation PWA / hors-ligne

## Lancer

Le service worker nécessite un serveur HTTP. Par exemple :

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

## Données réelles

La V1 est livrée avec un mode démonstration pour fonctionner immédiatement sans compte ni serveur.

Les champs CoinGecko et Finnhub dans Réglages préparent le branchement de données réelles. Pour une version publique, il est recommandé de déplacer les clés/API côté backend plutôt que de les exposer dans le navigateur.

## Important

Les scores et indications sont des aides à la lecture du marché et ne constituent pas des conseils financiers.


## V1.2
- Mini/maxi modifiables aussi depuis la fiche détaillée d'un actif.
- La fiche se met à jour immédiatement après modification.
- Le cadre rouge/vert suit immédiatement le nouveau seuil.


## V1.3
- Correction du clic sur les champs Mini/Maxi.
- Les champs ne déclenchent plus l'ouverture de la fiche au clic.
- Validation par perte de focus ou touche Entrée.
- Correction du cache du service worker.


## V1.4
- Remplacement de l'édition directe qui pouvait être interceptée par la carte.
- Bouton explicite « Modifier mini / maxi ».
- Fenêtre d'édition avec deux champs clairement cliquables.
- Enregistrement explicite des seuils.


## V1.5
- Les boutons de modification utilisent maintenant un clic HTML direct (`onclick`) afin de ne plus dépendre de la délégation d'événements JavaScript.
- Enregistrement des seuils également déclenché directement par le bouton.


## V1.6
- Correction de l'enregistrement de la fenêtre des seuils.
- Bouton Enregistrer fonctionnel directement.


## V1.7
- Suppression complète de la fenêtre modale.
- Mini et Maxi sont de vrais champs HTML directement éditables sur les cartes.
- Le clic sur la carte n'est plus utilisé pour ouvrir la fiche.
- Un bouton séparé « Voir le détail » ouvre la fiche.
- La simulation ne remplace pas le champ pendant que tu le modifies.


## V1.9
- Retour à la vraie interface complète de Market Watch.
- BTC et ETH utilisent exactement le même éditeur Mini/Maxi que SOL/NVDA/TSLA.
- Correction du moteur de simulation : il ne remplace jamais le bloc Mini/Maxi.
- La simulation continue toutes les 5 secondes sans interrompre une saisie en cours.
- Le bandeau indique « Démonstration V1.9 » pour confirmer le bon fichier chargé.


## V2.0
- Les seuils Mini/Maxi ne sont plus modifiables sur la page principale.
- L'édition est disponible uniquement dans la fiche détaillée.
- Les deux champs sont placés directement dans les blocs « Mini » et « Maxi » à côté du Score.
- Le graphique et le statut utilisent immédiatement les nouveaux seuils.


## V2.1
- Correction du vrai bug de V2.0.
- La page principale n'a plus aucun champ Mini/Maxi.
- Dans la fiche détaillée, les blocs Score / Mini / Maxi sont conservés.
- Mini et Maxi sont maintenant les champs de saisie eux-mêmes, directement à la place des valeurs 95 000 € et 110 000 €.
- Suppression du bloc séparé « Seuil minimum / Seuil maximum ».
- Version affichée : V2.1.


## V2.2
- Retour à l'ouverture de la fiche en cliquant directement sur toute la carte.
- Suppression du bouton « Voir le détail ».
- Le liseré rouge/vert de seuil est maintenant aussi appliqué à toute la fiche détail.
- Suppression des avertissements textuels « Sous ton mini / Au-dessus du maxi » affichés dans le dashboard.
- Suppression des messages du type « Vérifie ton seuil personnalisé ».


## V3.0
- Remplacement du score unique par deux scores indépendants : achat et vente.
- Niveaux : 0–29 faible intérêt, 30–49 intérêt modéré, 50–69 à surveiller, 70–84 intéressant, 85–100 très fort potentiel.
- Chaque score explique le prix, la tendance, les actualités, les événements et la volatilité.
- Actualités et événements sont affichés dans la fiche détaillée.
- Message clair si aucune actualité importante ou aucun événement majeur proche.
- La carte entière ouvre directement la fiche.


## V3.1
- Correction de la logique achat/vente.
- Achat : score élevé lorsque le cours est proche ou sous le seuil minimum.
- Vente : score élevé lorsque le cours est proche ou au-dessus du seuil maximum.
- La tendance, les actualités, les événements et la volatilité sont secondaires au positionnement dans la zone personnalisée.
- Ajout d'une explication visible dans l'analyse.


## V3.2
- Suppression des pastilles ambiguës « 🟢 57 · 🔴 37 ».
- Affichage explicite « ACHAT » et « VENTE » sur les cartes.
- Scores colorés selon un dégradé rouge → blanc → vert : 0 rouge, 50 blanc, 100 vert.
- Même présentation claire dans la fiche détaillée.


## V3.3
- Les scores compacts des cartes utilisent maintenant uniquement les symboles Ⓐ pour Achat et Ⓥ pour Vente.
- Le libellé texte ACHAT/VENTE a été retiré.
- Les scores gardent le dégradé rouge → blanc → vert.


## V3.4
- Correction du dégradé de couleur des scores sur la page principale.
- Les couleurs sont réappliquées après chaque actualisation/rendu.
- Les scores suivent maintenant réellement le dégradé rouge → blanc → vert à chaque mise à jour.
- Correction du cas où le CSS imposait à nouveau le blanc après le calcul JavaScript.


## V3.5
- Ⓐ et Ⓥ prennent maintenant exactement la couleur de leur score.
- La couleur est appliquée directement après chaque rendu pour résister aux actualisations.
- Nouvelle logique de score : 50 % de la zone Mini/Maxi = point de référence.
- À 50 %, Achat = 0 et Vente = 0.
- Sous 50 %, seul le score Achat augmente progressivement jusqu'à 100 au Mini.
- Au-dessus de 50 %, seul le score Vente augmente progressivement jusqu'à 100 au Maxi.
- Les actualités et événements modulent légèrement le score sans pouvoir créer une opportunité à 50 %.


## V3.6
- Correction définitive de l'affichage couleur des scores sur les cartes.
- Le symbole Ⓐ/Ⓥ et son score reçoivent maintenant la couleur directement dans le HTML.
- La couleur utilise aussi `-webkit-text-fill-color` pour éviter les règles de texte qui la masquent.
- Les couleurs sont recréées à chaque rendu des cartes, donc ne dépendent plus d'un traitement après actualisation.


## V3.7
- Affichage des scores en pourcentage : `0 %`, `57 %`, `100 %`.
- Suppression de la notation `0/100` dans la fiche détaillée.


## V4.0 — Données réelles Finnhub

La PWA peut maintenant utiliser un petit backend Fastify pour récupérer les données réelles sans exposer la clé Finnhub dans le navigateur.

### 1. Créer la clé Finnhub
Créer un compte et récupérer la clé API depuis le tableau de bord Finnhub.

### 2. Installer l'API
```bash
npm install
cp .env.example .env
nano .env
```
Mettre la clé dans `FINNHUB_API_KEY`.

### 3. Lancer
```bash
npm start
```

Par défaut l'API écoute sur `http://localhost:8787`.

### 4. PWA
Si la PWA est servie par le même serveur/proxy que l'API, elle utilise automatiquement `/api`.
Sinon définir avant le chargement de l'application :
```html
<script>window.MARKET_WATCH_API="https://ton-api.example.com/api";</script>
```

### Données V4
- cours réels BTC / ETH / SOL / NVDA / TSLA via Finnhub ;
- variation réelle ;
- actualisation périodique ;
- conservation de l'interface, seuils et scores ;
- historique reste prêt pour le vrai graphique ;
- endpoints backend préparés pour news, historique et calendrier des résultats.

Le plan gratuit Finnhub est indiqué comme personnel et limité à 60 appels/minute. La couverture et les droits d'affichage doivent être vérifiés selon l'usage prévu. 


## V4.1 — GitHub Pages / statique

Cette version n'utilise plus de backend : elle appelle directement l'API Finnhub depuis la PWA statique.

- `config.js` contient la clé Finnhub fournie pour cette installation.
- Le bandeau affiche explicitement `🟢 DONNÉES RÉELLES · FINNHUB` quand des cours réels ont été reçus.
- Si Finnhub ne répond pas, l'application affiche `🟠 DÉMO · FINNHUB INDISPONIBLE`.
- L'actualisation réelle est effectuée toutes les 60 secondes.

### Important
Une PWA statique ne peut pas garder une clé API secrète : la clé doit être envoyée au navigateur et peut donc être visible par toute personne ayant accès au site. Si le dépôt GitHub est public, la clé est également visible dans `config.js`. Pour une installation personnelle, cela peut être acceptable selon les conditions de Finnhub. Si la clé doit rester secrète, il faut un backend/proxy.

Finnhub exige un token sur les appels GET et documente les symboles crypto de type `BINANCE:BTCUSDT`. 


## V4.2
- Correction du bug qui empêchait V4.1 d'utiliser Finnhub : l'ancien code backend `/api/market` était encore chargé après la nouvelle fonction.
- Suppression du doublon de `refreshRealData()`.
- Suppression de toute référence à `API_BASE`.
- `config.js` ajouté au cache du Service Worker.
- La PWA statique utilise maintenant uniquement l'API Finnhub directe.

## V4.3 — données réelles + graphiques interactifs

- **Crypto : CoinGecko** en EUR pour BTC, ETH et SOL.
- **Actions : Finnhub** pour les cours US NVDA, TSLA, etc.
- Les cryptos utilisent l'historique réel CoinGecko avec plusieurs périodes : **1J, 1S, 1M, 6M, 1A**.
- Les actions construisent un historique **réel depuis l'ouverture de la PWA**, alimenté par les cotations Finnhub toutes les 60 secondes.
- Le graphique détail est interactif : toucher/cliquer un point affiche **le montant exact + la date + l'heure**.
- Le bandeau distingue séparément l'état réel Crypto et Bourse.
- Aucune valeur de démonstration n'est utilisée pour remplacer silencieusement une donnée réelle indisponible.

CoinGecko documente son API publique sans clé pour le prototypage et l'endpoint `market_chart` fournit les séries historiques prix/temps. Finnhub fournit les cotations temps réel pour les actions US. 
