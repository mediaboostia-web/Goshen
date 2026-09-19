import type { Metadata } from 'next';
import Link from 'next/link';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';

export const metadata: Metadata = {
  title: 'Politique de protection des données',
  description:
    'Les mesures techniques et organisationnelles Goshen met en place pour protéger les données financières de votre église : chiffrement, rôles, audit, sauvegardes.',
};

const LAST_UPDATED = '19 septembre 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-8 border-b border-stone-100 last:border-b-0">
      <h2 className="font-serif text-xl font-bold text-emerald-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-stone-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function DataProtectionPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] font-sans">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/">
            <GoshenWordmark markClassName="h-6 w-6" wordmarkClassName="text-lg" />
          </Link>
          <Link href="/" className="text-xs font-bold text-emerald-800 hover:text-emerald-950">
            &larr; Retour à l’accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Dernière mise à jour : {LAST_UPDATED}
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-stone-950">
          Politique de protection des données
        </h1>
        <p className="mt-4 text-sm text-stone-600 leading-relaxed">
          Ce document détaille les mesures concrètes qui protègent les données financières de votre
          église au quotidien — au-delà de ce qui est collecté (voir notre{' '}
          <Link href="/confidentialite" className="text-emerald-800 underline">
            Politique de confidentialité
          </Link>
          ).
        </p>

        <div className="mt-4">
          <Section title="1. Chiffrement">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Toutes les connexions à Goshen passent par une liaison chiffrée (HTTPS/TLS).</li>
              <li>
                Les mots de passe ne sont jamais stockés en clair — uniquement leur empreinte
                chiffrée.
              </li>
              <li>
                Les données sont hébergées sur une infrastructure de base de données managée,
                chiffrée au repos.
              </li>
            </ul>
          </Section>

          <Section title="2. Authentification et sessions">
            <p>
              La connexion utilise un jeton de courte durée (renouvelé automatiquement) plutôt
              qu’une session illimitée, pour réduire le risque en cas de vol d’appareil. Un jeton
              anti-falsification (CSRF) protège chaque action qui modifie vos données. Vous pouvez
              également vous connecter avec Google, qui applique ses propres standards de sécurité.
            </p>
          </Section>

          <Section title="3. Contrôle d’accès par rôle">
            <p>
              Chaque utilisateur a un rôle précis (Pasteur, Trésorier, Secrétaire, Auditeur,
              Administrateur) qui détermine ce qu’il peut voir et modifier. Une annexe ne peut pas
              consulter les données d’une autre annexe, sauf via la Vue Consolidée réservée aux
              rôles autorisés.
            </p>
          </Section>

          <Section title="4. Piste d’audit">
            <p>
              Chaque écriture financière et chaque action d’administration (changement de rôle,
              suppression, modification) est horodatée et attribuée à son auteur. Rien ne se modifie
              silencieusement.
            </p>
          </Section>

          <Section title="5. Sauvegardes et continuité">
            <p>
              La base de données bénéficie de sauvegardes régulières gérées par notre hébergeur, ce
              qui permet une restauration en cas d’incident technique. Cela ne remplace pas l’export
              régulier de vos propres données, que nous recommandons pour vos archives.
            </p>
          </Section>

          <Section title="6. Sous-traitants techniques">
            <p>
              Un nombre volontairement restreint de prestataires traite des données en notre nom,
              chacun uniquement pour la fonction qui le concerne : hébergement de base de données,
              stockage d’images, envoi d’emails transactionnels, et mise en cache/sécurité du
              trafic. Aucun de ces prestataires n’est autorisé à réutiliser vos données à d’autres
              fins.
            </p>
          </Section>

          <Section title="7. Minimisation des données">
            <p>
              Goshen ne collecte que ce qui est nécessaire au suivi financier de votre église. Nous
              ne demandons pas d’informations personnelles sur vos fidèles au-delà de ce que votre
              église choisit elle-même de saisir (ex. bénéficiaire d’une dépense).
            </p>
          </Section>

          <Section title="8. En cas d’incident">
            <p>
              Si un incident de sécurité affectait vos données, votre église en serait informée dans
              les meilleurs délais, avec une description claire de ce qui s’est passé et des mesures
              prises.
            </p>
          </Section>

          <Section title="9. Vos responsabilités">
            <p>
              La sécurité est partagée : utilisez un mot de passe robuste et personnel par
              utilisateur, ne partagez jamais vos identifiants, et retirez l’accès d’un utilisateur
              qui quitte ses fonctions dès que possible depuis les paramètres de l’église.
            </p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-stone-400 leading-relaxed">
          Ce document est fourni à titre informatif pour accompagner le lancement de Goshen. Selon
          votre pays et votre statut, faites-le valider par un conseiller juridique avant
          publication définitive.
        </p>
      </main>
    </div>
  );
}
