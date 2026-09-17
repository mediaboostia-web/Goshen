# Goshen — livrables de marque v1.0

## Contenu

    charte-goshen.html          La charte complète, 24 pages, fichier unique hors-ligne
    goshen-tokens.css           Jetons de marque + composants de base pour le site et l'app
    goshen-fonts.html           Les lignes à coller dans le <head> (polices, jetons, favicon)
    logo/
      goshen-horizontal.svg           Logo principal, encre bleu nuit
      goshen-horizontal-creme.svg     Logo principal sur fond nuit
      goshen-lettre-g.svg             Verrouillage où le symbole sert de lettre G
      goshen-symbole.svg              Symbole seul, bleu nuit
      goshen-symbole-emeraude.svg     Symbole seul, émeraude
      goshen-symbole-creme.svg        Symbole seul, crème
      goshen-favicon.svg              Favicon 120 × 120, carré plein
      goshen-app-icon-512.svg         Icône d'application 512 × 512

## Installer sur le site

1. Copier `goshen-tokens.css` et le dossier `logo/` à la racine publique.
2. Coller le contenu de `goshen-fonts.html` dans le `<head>` de chaque page.
3. Construire avec les variables `--goshen-*` et les classes `.goshen-btn`, `.goshen-input`,
   `.goshen-table`, `.goshen-amount`, `.goshen-seal`. Ne jamais introduire de couleur
   hors des jetons.

Les SVG utilisent Archivo pour le mot « Goshen ». Si la police n'est pas chargée au moment
du rendu (impression par un prestataire, e-mail), demander la version vectorisée à la
direction de marque.

## Imprimer

- `charte-goshen.html` s'ouvre dans un navigateur et s'imprime en A4, une page par feuille.
  Dans la boîte d'impression : format A4, marges « aucune », cocher « graphiques d'arrière-plan ».
- Enveloppes de collecte : 114 × 162 mm, non couché crème 120 g, deux tons.
- Carte de visite : 85 × 55 mm, non couché crème 350 g.
- Rapports financiers : A4 blanc 90 g minimum, recto seul.
- Valeurs CMJN de la page 12 : conversions indicatives FOGRA39, à valider sur épreuve contractuelle.

## Constantes non négociables

1. Angle de courbure zéro, partout.
2. Tout est aligné à gauche.
3. Deux épaisseurs de filet : 2 px et 1 px.
4. Un seul bouton émeraude par écran.
5. Tout montant en Space Mono, aligné à droite.
6. L'or ne porte jamais de texte courant.
7. Photographies en noir et blanc, sans filtre.
8. Aucun emoji, aucune lueur, aucun dégradé.
