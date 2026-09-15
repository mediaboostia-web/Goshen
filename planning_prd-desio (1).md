# PRD — Desio

## 1. Vision produit

**Pitch en une phrase**
Desio est l'application web qui remplace le cahier papier des églises évangéliques et pentecôtistes du Gabon par une gestion financière transparente, multi-utilisateurs et multi-annexes, avec reporting automatique.

**Problème résolu**
Les communautés chrétiennes du Gabon — en particulier les Assemblées de Dieu et leurs 300 à 600 entités (églises mères + annexes) — gèrent l'intégralité de leurs finances sur des cahiers physiques. Chaque dimanche, les responsables comptent manuellement l'argent collecté, notent les montants dans un cahier, séparent entrées et dépenses, et produisent des comptes rendus oraux ou manuscrits. Ce processus génère des erreurs de calcul (confirmé par 6/7 répondants au sondage terrain), des justificatifs introuvables (5/7), une absence totale de traçabilité historique, et des confusions budgétaires lors des décaissements. Les tentatives précédentes de numérisation ont échoué pour trois raisons précises : absence de rôles et permissions (tout le monde pouvait tout faire), outil mono-utilisateur (un seul compte pour plusieurs personnes), et aucune valeur ajoutée par rapport au cahier. Les annexes, quant à elles, tardent à envoyer leurs rapports au siège (6/7), ce qui empêche toute vision consolidée.

**Pourquoi maintenant**
- L'ACERAC pousse officiellement pour l'indépendance financière et la transparence de gestion des églises en Afrique centrale — le timing institutionnel est favorable.
- Aucun outil existant ne combine gestion financière multi-annexes, mobile money (Airtel Money / Moov Money), et pricing FCFA. Church Manager est calé sur les normes européennes (GDPR, reçus fiscaux EU). Les outils US (MosesTab, ChMeetings) ignorent le contexte CEMAC.
- Le fondateur est membre actif des Assemblées de Dieu du Gabon avec un accès direct au réseau de 100+ églises — avantage de distribution impossible à répliquer par un concurrent extérieur.
- 5 bêta-testeurs sont déjà identifiés et volontaires via le sondage terrain d'août 2026.

**Ce que Desio règle concrètement**

- **Erreurs de calcul post-culte** → Saisie numérique des montants avec calcul automatique du solde. Plus de recomptage manuel, plus de trous inexpliqués dans la caisse.
- **Justificatifs introuvables** → Chaque dépense est tracée avec date, auteur, catégorie et photo du reçu optionnelle. Tout est consultable à tout moment, par les personnes autorisées.
- **Dépenses récurrentes oubliées** → Modèles de dépenses configurables (cotisations, caisse nationale, salaires) avec notification automatique et validation en 1 clic. Plus besoin de "quelqu'un qui a la mémoire".
- **Rapports manuels chronophages** → Rapport PDF générable en 1 clic (feature demandée par 6/7 répondants). Remplace le compte rendu oral du dimanche et le rapport manuscrit envoyé au siège.
- **Aucune visibilité inter-annexes** → Le responsable d'un réseau bascule entre ses annexes en un tap, voit la caisse de chacune en temps réel, sans se déconnecter/reconnecter.

---

## 2. Personas cibles

### Persona 1 — Pasteur Éric Ndong, 52 ans, Pasteur principal, Libreville

- **Rôle** : Supervise une église mère et 3 annexes (Libreville, Owendo, Ntoum). Responsable final de la gouvernance financière devant l'assemblée et la hiérarchie dénominationnelle.
- **Pain points** :
  - Ne voit les chiffres des annexes que lorsque celles-ci envoient leur rapport — souvent en retard, parfois jamais.
  - Doit se fier à la mémoire des trésoriers pour reconstituer l'historique d'une dépense contestée.
  - Chaque incompréhension budgétaire entame sa crédibilité pastorale et la confiance de la communauté.
  - Les comptes rendus dominicaux sont oraux — aucun support vérifiable a posteriori.
- **Ce qu'il utilise aujourd'hui** : Cahier papier tenu par le trésorier + réunion dominicale de restitution orale. Zéro outil numérique.
- **Pouvoir d'achat** : L'église collecte entre 300 000 et 800 000 FCFA/mois en entrées. Un abonnement de 10 000 à 20 000 FCFA/mois est absorbable sans friction.

### Persona 2 — Sœur Christelle Mboulou, 38 ans, Trésorière d'annexe, Owendo

- **Rôle** : Compte physiquement l'argent après chaque culte, note les montants dans le cahier, paie les dépenses courantes, et tente d'envoyer un rapport mensuel à l'église mère.
- **Pain points** :
  - Passe 30 minutes à 1 heure à compter et vérifier après chaque culte (confirmé par 6/7 au sondage).
  - Oublie des dépenses récurrentes (cotisation à la caisse nationale, salaire gardien) et les découvre trop tard.
  - N'a aucun moyen de prouver un décaissement si le reçu papier est perdu.
  - Si elle est absente un dimanche, personne ne sait où en est la caisse.
- **Ce qu'elle utilise aujourd'hui** : Cahier papier avec colonnes "Entrées" et "Sorties". Un stylo. Parfois une calculatrice de téléphone.
- **Pouvoir d'achat** : Son annexe collecte 100 000 à 250 000 FCFA/mois. Un abonnement de 3 000 à 5 000 FCFA/mois est réaliste.

### Persona 3 — Diacre Paul Ondo, 45 ans, Auditeur / Responsable financier régional, Libreville

- **Rôle** : Contrôle la conformité financière de plusieurs églises du réseau ADD Libreville. Vérifie que les fonds sont utilisés selon les décisions collectives. Rend des comptes à la coordination nationale.
- **Pain points** :
  - Doit se déplacer physiquement dans chaque annexe pour consulter les cahiers.
  - Les chiffres qu'on lui présente ne sont pas toujours cohérents avec les précédents rapports — sans historique centralisé, impossible de vérifier.
  - Ne peut produire aucun rapport consolidé pour la coordination nationale.
- **Ce qu'il utilise aujourd'hui** : Les cahiers des différentes annexes qu'il consulte en personne + notes manuscrites personnelles.
- **Pouvoir d'achat** : N'est pas le payeur. L'église ou le réseau régional prendrait l'abonnement.

---

## 3. Pages & écrans

### Parcours d'onboarding

**3.1 — Page d'accueil marketing**
- Sert à présenter Desio, convaincre un pasteur ou trésorier de s'inscrire, et afficher les tarifs.
- Accès : public (tout visiteur).
- Actions clés : lire la proposition de valeur, consulter les plans tarifaires, cliquer sur "Créer mon église".

**3.2 — Page d'inscription**
- Sert à créer le compte de l'église sur Desio.
- Accès : le fondateur de l'église (souvent le pasteur ou le trésorier principal).
- Actions clés : renseigner le nom de l'église, le nom du responsable, le numéro de téléphone et le mot de passe ; valider via code OTP envoyé par email.

**3.3 — Page de configuration initiale de l'église**
- Sert à paramétrer l'église après inscription : créer l'église mère, ajouter les annexes, définir les catégories d'entrées et de dépenses, inviter les premiers membres.
- Accès : le créateur du compte (rôle Pasteur par défaut).
- Actions clés : nommer l'église mère, ajouter 1 à 5 annexes, personnaliser les catégories financières (dîmes, offrandes, dons spéciaux, cotisations, caisse nationale, salaires…), inviter des membres par email en leur attribuant un rôle.

### Parcours principal — Gestion quotidienne

**3.4 — Tableau de bord**
- Sert à voir en un coup d'œil la santé financière de l'église ou de l'annexe active.
- Accès : Pasteur, Trésorier, Secrétaire, Auditeur (chacun voit selon ses permissions). C'est la page d'atterrissage après connexion.
- Actions clés : consulter le solde actuel, voir la répartition entrées vs dépenses du mois en cours, recevoir une alerte si le solde est bas, basculer vers une autre annexe (pour les rôles multi-annexes).

**3.5 — Sélecteur d'annexe (composant présent sur toutes les pages)**
- Sert à basculer entre les annexes rattachées au même réseau sans se déconnecter.
- Accès : tout utilisateur ayant accès à plusieurs annexes (Pasteur principal, Auditeur régional).
- Actions clés : choisir l'annexe active dans une liste, voir instantanément les données de cette annexe sur toutes les pages.

**3.6 — Page des entrées**
- Sert à enregistrer et consulter toutes les rentrées d'argent de l'église (dîmes, offrandes, dons spéciaux, collectes exceptionnelles).
- Accès : Trésorier (saisie + consultation), Secrétaire (consultation), Pasteur (consultation), Auditeur (consultation).
- Actions clés : ajouter une nouvelle entrée (montant, date, catégorie, commentaire optionnel), consulter l'historique des entrées avec filtres (date, catégorie, montant), exporter la liste filtrée.

**3.7 — Page des dépenses ponctuelles**
- Sert à enregistrer et consulter les dépenses non récurrentes (réparations, achats, imprévus, remboursements d'emprunts).
- Accès : Trésorier (saisie + consultation), Pasteur (consultation + approbation si configuré), Secrétaire (consultation), Auditeur (consultation).
- Actions clés : ajouter une dépense (montant, date, catégorie, bénéficiaire, photo du reçu optionnelle), consulter l'historique filtré, voir le détail d'une dépense avec son justificatif.

**3.8 — Page des dépenses récurrentes**
- Sert à créer, gérer et suivre les modèles de dépenses qui reviennent chaque semaine ou chaque mois (cotisations, salaires, caisse nationale, loyer).
- Accès : Trésorier (CRUD complet), Pasteur (CRUD complet), Secrétaire (consultation seule), Auditeur (consultation seule).
- Actions clés : créer un modèle de dépense récurrente (nom, montant, fréquence, catégorie), modifier ou suspendre un modèle existant, voir l'historique des exécutions passées (date de validation, valideur, montant déduit).

**3.9 — Page de validation des dépenses récurrentes**
- Sert au trésorier à valider (ou reporter) les dépenses récurrentes arrivées à échéance, avant leur déduction du solde.
- Accès : Trésorier (action de validation), Pasteur (action de validation).
- Actions clés : voir la liste des dépenses récurrentes en attente de validation, valider en 1 clic (= déduction immédiate du solde + trace historique), reporter une échéance avec motif.

**3.10 — Page de reporting**
- Sert à générer et consulter des rapports financiers synthétiques, exportables en PDF.
- Accès : Pasteur, Trésorier, Auditeur.
- Actions clés : sélectionner une période (semaine, mois, trimestre, personnalisée), générer un rapport PDF en 1 clic (entrées, dépenses, solde, détail par catégorie), consulter les rapports précédemment générés.

### Parcours d'administration

**3.11 — Page de gestion des membres**
- Sert à inviter, modifier ou désactiver les comptes des personnes qui accèdent à Desio pour cette église.
- Accès : Pasteur uniquement.
- Actions clés : inviter un membre par email + attribution de rôle, modifier le rôle d'un membre existant, désactiver un compte (sans supprimer l'historique de ses actions).

**3.12 — Page de gestion des annexes**
- Sert à ajouter, renommer ou désactiver une annexe rattachée à l'église mère.
- Accès : Pasteur uniquement.
- Actions clés : ajouter une nouvelle annexe, modifier le nom ou les infos d'une annexe, rattacher un membre existant à une annexe.

**3.13 — Page des paramètres de l'église**
- Sert à configurer les éléments globaux : nom de l'église, catégories d'entrées/dépenses personnalisées, seuil d'alerte de solde bas, numéro Airtel Money / Moov Money pour les dons en ligne (P1).
- Accès : Pasteur.
- Actions clés : modifier les informations de l'église, ajouter/modifier/supprimer des catégories financières, configurer le seuil d'alerte de solde.

**3.14 — Page de profil utilisateur**
- Sert à chaque utilisateur de gérer ses propres informations et sa sécurité.
- Accès : tout utilisateur connecté.
- Actions clés : modifier son nom ou email, changer son mot de passe, se déconnecter.

**3.15 — Page d'abonnement**
- Sert à l'église pour choisir, souscrire ou modifier son plan d'abonnement Desio.
- Accès : Pasteur.
- Actions clés : voir le plan actuel et les limites restantes, passer à un plan supérieur, payer via Airtel Money ou Moov Money, consulter l'historique des paiements.

**3.16 — Page de notifications**
- Sert à consulter toutes les alertes : dépenses récurrentes en attente, solde bas, rappels non validés sous 24h, rapports générés.
- Accès : tout utilisateur connecté (notifications filtrées selon le rôle).
- Actions clés : lire une notification, agir directement depuis la notification (ex: valider une dépense récurrente), marquer comme lue.

---

## 4. Fonctionnalités MVP (V1)

### Authentification & Gestion des accès

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F01 | Inscription par email + OTP | Le responsable crée le compte de l'église avec son email. Validation par code email. | P0 |
| F02 | Connexion par email + mot de passe | Accès sécurisé. Option "mot de passe oublié" via OTP email. | P0 |
| F03 | Système de rôles | 4 rôles : Pasteur (admin complet), Trésorier (saisie + validation), Secrétaire (consultation + saisie limitée), Auditeur (consultation seule). Chaque rôle a des permissions précises par page et par action. | P0 |
| F04 | Invitation de membres | Le Pasteur invite un membre par email et lui attribue un rôle. Le membre reçoit un email avec un lien pour créer son mot de passe. | P0 |
| F05 | Désactivation de compte | Le Pasteur peut désactiver un membre sans supprimer l'historique de ses actions (traçabilité préservée). | P0 |

### Multi-annexes

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F06 | Création d'annexes | Le Pasteur peut créer jusqu'à 5 annexes rattachées à l'église mère (limite extensible selon le plan). Chaque annexe a son propre solde, ses propres entrées et dépenses. | P0 |
| F07 | Switch d'annexe sans déconnexion | Un utilisateur ayant accès à plusieurs annexes bascule en 1 tap. Toutes les données affichées (tableau de bord, entrées, dépenses, rapports) s'actualisent immédiatement selon l'annexe sélectionnée. | P0 |
| F08 | Vue consolidée | Le Pasteur principal peut voir un tableau de bord agrégé de toutes ses annexes : solde total, entrées totales, dépenses totales, répartition par annexe. | P0 |
| F09 | Rattachement de membres aux annexes | Un membre peut être rattaché à une ou plusieurs annexes. Ses permissions s'appliquent dans chaque annexe où il est rattaché. | P0 |

### Gestion des entrées

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F10 | Saisie d'une entrée | Le Trésorier enregistre une entrée : montant (FCFA), date, catégorie (dîme, offrande, don spécial, collecte — personnalisables), commentaire optionnel. L'auteur de la saisie est automatiquement tracé. | P0 |
| F11 | Historique des entrées | Liste chronologique de toutes les entrées avec filtres par période, catégorie et montant. Accessible en consultation à tous les rôles. | P0 |
| F12 | Catégories d'entrées personnalisables | L'église définit ses propres catégories d'entrées (ex: "Offrande de mission", "Don bâtiment") en plus des catégories par défaut. CRUD réservé au Pasteur. | P0 |

### Gestion des dépenses ponctuelles

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F13 | Saisie d'une dépense ponctuelle | Le Trésorier enregistre une dépense : montant, date, catégorie, bénéficiaire, commentaire, photo du reçu optionnelle. L'auteur est tracé. Le solde est immédiatement mis à jour. | P0 |
| F14 | Historique des dépenses | Liste chronologique filtrable. Clic sur une dépense = détail complet avec photo du justificatif si attaché. | P0 |
| F15 | Catégories de dépenses personnalisables | Même principe que les entrées. Catégories par défaut (fournitures, transport, entretien) + catégories libres créées par le Pasteur. | P0 |

### Dépenses récurrentes

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F16 | Création de modèles récurrents | Le Trésorier ou le Pasteur crée un modèle : nom (ex: "Cotisation caisse nationale"), montant fixe, fréquence (hebdomadaire / mensuel), catégorie, jour d'échéance. | P0 |
| F17 | Notification à l'échéance | À chaque échéance, le Trésorier reçoit une notification dans l'app : "Cotisation caisse nationale — 50 000 FCFA — à valider". | P0 |
| F18 | Validation en 1 clic | Le Trésorier valide la dépense récurrente en 1 clic. Le montant est déduit du solde. Une ligne est créée dans l'historique des dépenses avec la mention "récurrente", la date et le valideur. | P0 |
| F19 | Rappel automatique si non validé | Si une dépense récurrente n'est pas validée sous 24h, un rappel est envoyé au Trésorier. Après 48h, le Pasteur est également notifié. | P0 |
| F20 | Modification / suspension / suppression de modèles | CRUD complet sur les modèles, réservé aux rôles Trésorier et Pasteur. L'historique des exécutions passées reste intact même après suppression du modèle. | P0 |

### Tableau de bord

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F21 | Solde en temps réel | Affichage du solde actuel de l'annexe sélectionnée (ou consolidé si vue globale). Mis à jour après chaque entrée ou dépense. | P0 |
| F22 | Résumé entrées vs dépenses | Comparaison visuelle des entrées et dépenses du mois en cours, avec variation par rapport au mois précédent. | P0 |
| F23 | Alerte solde bas | Si le solde descend sous un seuil configurable par l'église, une alerte visuelle apparaît sur le tableau de bord et une notification est envoyée au Pasteur et au Trésorier. | P0 |
| F24 | Dernières opérations | Liste des 10 dernières entrées et dépenses, toutes annexes confondues si vue consolidée. | P0 |

### Reporting

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F25 | Rapport PDF en 1 clic | Sélection d'une période → génération d'un PDF contenant : total entrées par catégorie, total dépenses par catégorie, solde d'ouverture, solde de clôture, liste détaillée des opérations. Le PDF porte le nom et le logo de l'église. | P0 |
| F26 | Historique des rapports | Tous les rapports générés sont archivés et re-téléchargeables. | P0 |
| F27 | Rapport par annexe ou consolidé | Le Pasteur peut générer un rapport pour une annexe spécifique ou un rapport consolidé toutes annexes. | P0 |

### Notifications

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F28 | Centre de notifications in-app | Page listant toutes les notifications de l'utilisateur : dépenses récurrentes à valider, solde bas, rappels. Actions directes depuis la notification. | P0 |
| F29 | Notifications push navigateur | Si l'utilisateur active les notifications de son navigateur, les alertes critiques (dépenses à valider, solde bas) sont poussées même quand l'app n'est pas ouverte. | P1 |

### Abonnement & Paiement

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F30 | Page d'abonnement | Affichage du plan actuel, des limites (nombre d'annexes, membres), de la date de renouvellement. | P0 |
| F31 | Souscription / upgrade via mobile money | Paiement de l'abonnement par Airtel Money ou Moov Money. Confirmation instantanée. | P0 |
| F32 | Historique de paiement | Liste de tous les paiements d'abonnement passés avec date et montant. | P0 |

### Features P1 (post-lancement)

| # | Feature | Description | Priorité |
|---|---------|-------------|----------|
| F33 | Dons en ligne des fidèles | Lien de don partageable (WhatsApp, SMS). Le fidèle paie via Airtel Money / Moov Money. L'argent va directement sur le compte mobile money de l'église (Desio ne touche pas les fonds). Le don est automatiquement enregistré dans les entrées de l'église. | P1 |
| F34 | Mode hors-ligne | Saisie des entrées et dépenses sans connexion internet. Synchronisation automatique au retour de la connexion. Essentiel pour les 2-3 annexes identifiées en zones mal couvertes. | P1 |
| F35 | Notifications SMS | Pour les utilisateurs sans smartphone ou avec data limitée, les alertes critiques sont envoyées par SMS. | P1 |
| F36 | Gestion de projets financiers | Budget alloué à un projet (construction, événement social), suivi des dépenses dédiées, pourcentage d'avancement budgétaire. | P1 |

---

## 5. User Stories principales

### US01 — Inscription et configuration de l'église
**En tant que** Pasteur Éric, **je veux** créer le compte de mon église en 3 minutes avec mon email, ajouter mes 3 annexes et inviter ma trésorière, **afin de** commencer à utiliser Desio dès le dimanche suivant.

**Critères d'acceptation :**
- L'inscription se fait avec un email. Un code OTP est envoyé par email et doit être validé.
- Après inscription, un assistant de configuration guide l'utilisateur : nom de l'église → ajout d'annexes → personnalisation des catégories → invitation du premier membre.
- L'invitation d'un membre se fait par numéro de téléphone + choix du rôle. Le membre reçoit un SMS avec un lien pour créer son mot de passe.
- L'ensemble du processus (inscription + configuration + 1 invitation) doit être réalisable en moins de 5 minutes.

### US02 — Saisie des entrées après le culte
**En tant que** Sœur Christelle (Trésorière), **je veux** saisir les dîmes et offrandes du dimanche en précisant le montant et la catégorie, **afin que** le solde se mette à jour instantanément et que l'opération soit tracée avec mon nom et la date.

**Critères d'acceptation :**
- Le formulaire de saisie contient : montant (champ numérique en FCFA), date (pré-remplie au jour courant, modifiable), catégorie (liste déroulante des catégories de l'église), commentaire (optionnel, texte libre).
- Après validation, le solde de l'annexe est mis à jour en temps réel.
- L'opération apparaît dans l'historique des entrées avec l'identité de l'auteur de la saisie.
- Un rôle "Secrétaire" ne peut pas saisir d'entrée (consultation seule). Un rôle "Auditeur" non plus.

### US03 — Saisie d'une dépense avec justificatif
**En tant que** Sœur Christelle (Trésorière), **je veux** enregistrer une dépense imprévue avec une photo du reçu, **afin que** personne ne puisse contester cette dépense plus tard.

**Critères d'acceptation :**
- Le formulaire de dépense contient : montant, date, catégorie, bénéficiaire (texte libre), commentaire, et un bouton pour prendre une photo ou télécharger une image du reçu.
- La photo est rattachée à la dépense et consultable depuis le détail de l'opération.
- Le solde est déduit immédiatement après validation.
- L'auteur de la saisie est automatiquement enregistré.

### US04 — Validation d'une dépense récurrente
**En tant que** Sœur Christelle (Trésorière), **je veux** recevoir une notification quand la cotisation mensuelle à la caisse nationale arrive à échéance et la valider en 1 clic, **afin de** ne plus jamais oublier cette dépense et avoir une trace automatique.

**Critères d'acceptation :**
- À la date d'échéance du modèle récurrent, une notification apparaît dans le centre de notifications de l'app.
- La notification affiche : nom de la dépense, montant, et un bouton "Valider".
- Au clic sur "Valider", le montant est déduit du solde, une ligne est créée dans l'historique des dépenses (catégorie "récurrente", nom du modèle, valideur, date).
- Si la dépense n'est pas validée sous 24h, un rappel est envoyé au Trésorier.
- Si toujours pas validée sous 48h, le Pasteur est notifié.
- Le Trésorier peut aussi "Reporter" l'échéance en ajoutant un motif (ex: "fonds insuffisants ce mois").

### US05 — Basculer entre annexes
**En tant que** Pasteur Éric, **je veux** voir la caisse de mon annexe d'Owendo sans me déconnecter de mon compte, **afin de** suivre toutes mes annexes en temps réel depuis un seul endroit.

**Critères d'acceptation :**
- Un sélecteur d'annexe est visible en permanence (en haut de chaque page ou dans un menu).
- Au changement d'annexe, le tableau de bord, les entrées, les dépenses, et les rapports affichent les données de l'annexe sélectionnée.
- Le changement est instantané (pas de rechargement de page complet, pas de nouvelle connexion).
- Une option "Vue consolidée" affiche les totaux agrégés de toutes les annexes.

### US06 — Générer un rapport PDF
**En tant que** Pasteur Éric, **je veux** générer un rapport PDF du mois pour l'envoyer à la coordination nationale, **afin de** remplacer le rapport manuscrit que mes annexes mettent des semaines à m'envoyer.

**Critères d'acceptation :**
- L'utilisateur sélectionne une période (semaine, mois, trimestre, ou dates personnalisées) et une portée (une annexe ou toutes les annexes).
- Le PDF généré contient : nom et logo de l'église, période couverte, solde d'ouverture, total entrées par catégorie, total dépenses par catégorie, liste détaillée des opérations, solde de clôture.
- Le PDF est téléchargeable et partageable (lien ou fichier).
- Le rapport est archivé dans l'historique des rapports et re-téléchargeable ultérieurement.

### US07 — Consulter le tableau de bord
**En tant que** Diacre Paul (Auditeur), **je veux** voir le solde actuel et les dernières opérations de chaque annexe, **afin de** vérifier la cohérence financière sans me déplacer physiquement.

**Critères d'acceptation :**
- Le tableau de bord affiche : solde actuel, entrées du mois, dépenses du mois, variation vs mois précédent, 10 dernières opérations.
- L'Auditeur peut voir les données mais ne peut ni saisir, ni modifier, ni supprimer aucune opération.
- L'Auditeur peut basculer entre les annexes auxquelles il est rattaché.
- Si le solde est inférieur au seuil d'alerte configuré, un indicateur visuel est affiché.

### US08 — Créer un modèle de dépense récurrente
**En tant que** Sœur Christelle (Trésorière), **je veux** créer un modèle "Salaire gardien — 75 000 FCFA — mensuel — le 28 de chaque mois", **afin que** le système me rappelle automatiquement chaque mois au lieu de compter sur ma mémoire.

**Critères d'acceptation :**
- Le formulaire de création contient : nom du modèle, montant, fréquence (hebdomadaire / mensuel), jour d'échéance, catégorie.
- Le modèle apparaît dans la liste des dépenses récurrentes avec son statut (actif / suspendu).
- Le Trésorier peut modifier le montant ou la fréquence d'un modèle actif. L'historique des exécutions passées n'est pas affecté.
- Le Trésorier peut suspendre un modèle (les notifications cessent) ou le supprimer (l'historique reste).
- Un rôle Secrétaire ou Auditeur ne peut ni créer, ni modifier, ni supprimer de modèle.

---

## 6. Business Model & Monétisation

### Modèle de revenus
**Freemium + abonnement mensuel en FCFA.** Le plan gratuit permet à une petite église de résoudre son problème de base (fin du cahier papier). Les plans payants débloquent le multi-annexes, le nombre de membres, et le reporting avancé.

### Grille tarifaire

| | **Gratuit** | **Essentiel** | **Premium** |
|---|---|---|---|
| **Prix** | 0 FCFA | ~~5 000 FCFA~~ → **3 500 FCFA/mois** (offre de lancement) | ~~20 000 FCFA~~ → **15 000 FCFA/mois** (offre de lancement) |
| **Cible** | Petite église de quartier, test | Église locale avec 1-2 annexes | Grande assemblée, réseau multi-annexes |
| **Annexes** | 1 (église seule, pas d'annexe) | Jusqu'à 3 | Jusqu'à 10 |
| **Membres (utilisateurs)** | 2 | 10 | Illimité |
| **Saisie entrées/dépenses** | ✅ Illimitée | ✅ Illimitée | ✅ Illimitée |
| **Dépenses récurrentes** | 3 modèles max | Illimité | Illimité |
| **Rapports PDF** | 1 par mois | Illimité | Illimité |
| **Historique** | 6 mois | 24 mois | Illimité |
| **Vue consolidée multi-annexes** | ❌ | ✅ | ✅ |
| **Photo reçu / justificatif** | ❌ | ✅ | ✅ |
| **Alerte solde bas** | ❌ | ✅ | ✅ |
| **Dons en ligne (P1)** | ❌ | ❌ | ✅ |
| **Support** | Communautaire (groupe WhatsApp) | WhatsApp prioritaire | WhatsApp + appel direct |

### Moyens de paiement pour l'abonnement
- **Airtel Money** (dominant au Gabon) — obligatoire
- **Moov Money** — obligatoire
- Carte bancaire Visa/Mastercard — optionnel (faible adoption au Gabon, mais utile pour la diaspora)

### Logique économique
- Une église ADD type collecte 300 000 à 800 000 FCFA/mois. Un abonnement à 3 500 FCFA représente 0,4% à 1,2% de ses entrées — friction quasi nulle.
- Le plan gratuit sert d'acquisition : un trésorier teste seul, puis l'église passe au plan Essentiel quand elle veut ajouter les annexes et les autres membres.
- Le plan Premium cible les pasteurs principaux qui supervisent un réseau entier et ont besoin de la vue consolidée et du reporting complet.

---

## 7. Métriques de succès

### Objectifs à 90 jours post-lancement (bêta → lancement public)

| Métrique | Cible | Justification |
|----------|-------|---------------|
| Églises inscrites | 15 | 5 bêta-testeurs déjà identifiés + bouche-à-oreille dans le réseau ADD Libreville (~30 églises accessibles directement) |
| Taux d'activation J+7 | > 40% | Activation = au moins 5 entrées saisies dans la première semaine. L'onboarding guidé et la migration du cahier du dimanche doivent déclencher l'usage dès le premier culte. |
| Utilisateurs actifs hebdomadaires par église | ≥ 2 | L'app doit être utilisée par au moins le trésorier + le pasteur chaque semaine. C'est le signal que Desio a remplacé le cahier, pas juste complété. |
| Rapports PDF générés | ≥ 30 | Moyenne de 2 rapports par église inscrite. Feature #1 demandée par le sondage — son usage valide l'adoption. |
| Conversion gratuit → payant | 20-30% | Taux élevé justifié par le canal d'acquisition (recommandation directe pasteur à pasteur, pas de trafic froid). Les églises du réseau ADD ont confirmé leur disposition à payer. |
| NPS (Net Promoter Score) | > 50 | Mesuré par un sondage in-app à J+30. Le réseau ecclésial fonctionne au bouche-à-oreille — un NPS élevé est la condition de la croissance organique. |
| Churn mensuel | < 5% | Une église qui a migré ses données du cahier vers Desio ne revient pas en arrière, sauf si l'outil est défaillant. Le churn doit rester structurellement bas. |

### Indicateurs avancés (à suivre à partir du mois 3)

| Métrique | Cible |
|----------|-------|
| Revenu mensuel récurrent (MRR) | 50 000+ FCFA (15 églises payantes × 3 500 FCFA minimum) |
| Dépenses récurrentes validées dans les 24h | > 80% (mesure l'efficacité du flow notif → validation) |
| Délai moyen entre échéance et validation | < 12h |
| Annexes actives par église (plan Essentiel/Premium) | ≥ 2 |

---

## 8. Ce qui est HORS SCOPE V1

| Feature exclue | Raison |
|----------------|--------|
| **Dons en ligne des fidèles** | Nécessite intégration API mobile money complexe (Airtel Money / Moov Money). Reporté en P1 après validation de l'adoption de la V1 par les églises. Les dons continuent en espèces — Desio les trace après coup. |
| **Mode hors-ligne** | Techniquement complexe (synchronisation des données). Concerne 2-3 annexes en zones mal couvertes. Priorité P1 après avoir stabilisé l'expérience en ligne. |
| **Gestion de projets financiers** | Utile mais pas critique pour le remplacement du cahier. Les dépenses liées à un projet peuvent être saisies comme dépenses ponctuelles avec un commentaire. Le module dédié viendra en P1. |
| **Notifications SMS** | Nécessite un fournisseur SMS et un coût récurrent. En V1, les notifications sont in-app. Le SMS viendra en P1 pour les utilisateurs sans smartphone. |
| **Multi-devises** | Toutes les églises cibles opèrent en FCFA. Pas de besoin multi-devises tant que Desio reste au Gabon. |
| **Comptabilité avancée** | Pas de bilan comptable, pas de plan analytique, pas d'export vers un logiciel comptable. Les églises cibles n'ont pas de comptable — elles ont besoin de transparence, pas de conformité OHADA. |
| **Application mobile native** | Desio est une application web responsive accessible depuis le navigateur de n'importe quel smartphone. Pas d'app iOS/Android native en V1. Si l'adoption le justifie, une PWA installable sera envisagée. |
| **Multi-langues** | V1 en français uniquement. Le Gabon est francophone. L'anglais ou d'autres langues seront ajoutés si Desio s'étend au Nigeria, Kenya, ou Ghana. |
| **Système de budgétisation prévisionnelle** | Les églises cibles n'ont pas de culture budgétaire formelle. Desio trace ce qui est — pas ce qui devrait être. La budgétisation viendra quand les églises auront 6+ mois d'historique dans l'outil. |

---

## 9. Risques et mitigation

### Risque 1 — Résistance au changement : le cahier est "suffisant"
**Probabilité : élevée.** Les trésoriers gèrent sur cahier depuis des décennies. Même si le problème est reconnu (sondage), passer au numérique demande un changement d'habitude.
**Mitigation :** Onboarding en personne pour les 5 premiers bêta-testeurs (le fondateur se déplace dans l'église le dimanche et fait la saisie avec le trésorier). Migration assistée : le trésorier arrive avec son cahier, on saisit ensemble les données du mois en cours. Une fois les données dans Desio, le retour au cahier devient un recul visible.

### Risque 2 — Le pasteur achète mais le trésorier n'utilise pas
**Probabilité : moyenne.** Le décideur (pasteur) n'est pas l'utilisateur quotidien (trésorier). Si le trésorier ne saisit pas, l'outil est mort.
**Mitigation :** Le trésorier est le héros du produit, pas le pasteur. L'onboarding cible en priorité les trésoriers. Les features sont conçues pour leur faire gagner du temps (dépenses récurrentes, rapport PDF) plutôt que pour les surveiller. Le pasteur voit les données — le trésorier les crée. Si le trésorier gagne 30 minutes par dimanche, il adopte.

### Risque 3 — Marché trop petit pour un SaaS rentable
**Probabilité : moyenne.** 100 églises ADD au Gabon × 3 500 FCFA/mois = 350 000 FCFA/mois max sur ce segment. C'est insuffisant pour un business autonome.
**Mitigation :** Le Gabon est le marché de lancement, pas le marché cible final. Les ADD sont présentes dans toute l'Afrique centrale (Cameroun, Congo, RDC, Tchad). L'ACERAC couvre toute la zone CEMAC. Si Desio fonctionne au Gabon, l'expansion régionale suit le réseau dénominationnel. En parallèle, rien n'empêche de cibler d'autres dénominations (Plein Évangile, CEMA, églises indépendantes) au Gabon même.

### Risque 4 — Copie par Church Manager ou un concurrent local
**Probabilité : faible à court terme, moyenne à moyen terme.** Church Manager pourrait ajouter mobile money et adapter son pricing. Un développeur local pourrait copier l'idée.
**Mitigation :** L'avantage de Desio n'est pas la technologie — c'est le réseau. Le fondateur est dans les églises, connaît les pasteurs, comprend le vocabulaire (dîmes, offrandes, caisse nationale). Un concurrent extérieur mettra 12-18 mois à construire cette confiance. D'ici là, Desio aura 30-50 églises actives et un bouche-à-oreille difficile à rattraper. De plus, les tentatives locales passées ont échoué — Desio doit simplement ne pas reproduire leurs 3 erreurs (pas de rôles, mono-utilisateur, pas de valeur ajoutée).

### Risque 5 — Problèmes de confiance : "qui voit mes données financières ?"
**Probabilité : élevée.** Les finances de l'église sont un sujet sensible. Un pasteur peut hésiter à mettre ses chiffres "dans le cloud" — surtout après des expériences de détournement ou de méfiance.
**Mitigation :** Communication claire : seuls les membres invités par le pasteur voient les données. L'équipe Desio n'a pas accès aux montants (préciser dans les conditions d'utilisation et dans l'onboarding). Proposer une démo avec des données fictives avant que l'église saisisse ses vrais chiffres. Le rôle Auditeur existe précisément pour montrer que la transparence est contrôlée : le pasteur décide qui voit quoi.