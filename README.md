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
