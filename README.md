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
