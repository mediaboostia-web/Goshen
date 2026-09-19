import type { Metadata } from 'next';
import Link from 'next/link';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Quelles données Goshen collecte, pourquoi, avec qui elles sont partagées, et comment les consulter, exporter ou supprimer.',
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

export default function PrivacyPolicyPage() {
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
          Politique de confidentialité
        </h1>
        <p className="mt-4 text-sm text-stone-600 leading-relaxed">
          Goshen gère des données financières d’église : nous prenons donc la confidentialité au
          sérieux. Cette page explique simplement ce que nous collectons, pourquoi, et les droits
          dont vous disposez sur vos données.
        </p>

        <div className="mt-4">
          <Section title="1. Qui est responsable de vos données ?">
            <p>
              Goshen est édité pour le compte de l’église ou de l’organisation qui a créé le compte
              (« votre église »). Votre église est responsable des données qu’elle saisit dans
              l’application ; Goshen agit comme prestataire technique qui héberge et sécurise ces
              données.
            </p>
          </Section>

          <Section title="2. Quelles données nous collectons">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Compte :</strong> nom, adresse email, mot de passe (chiffré), rôle (Pasteur,
                Trésorier, Secrétaire, Auditeur).
              </li>
              <li>
                <strong>Données financières saisies par votre église :</strong> entrées (dîmes,
                offrandes), dépenses, catégories, annexes, notes et pièces justificatives que vous
                importez.
              </li>
              <li>
                <strong>Fichiers :</strong> logo de l’église et photos de reçus téléversées lors
                d’une saisie.
              </li>
              <li>
                <strong>Données techniques :</strong> adresse IP, journaux de connexion et
                d’erreurs, utilisés uniquement pour la sécurité et le bon fonctionnement du service.
              </li>
            </ul>
          </Section>

          <Section title="3. Pourquoi nous les utilisons">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Faire fonctionner votre espace de gestion financière (finalité contractuelle).
              </li>
              <li>Sécuriser les comptes (authentification, détection d’activité anormale).</li>
              <li>Générer vos rapports et reçus PDF.</li>
              <li>
                Vous envoyer les emails nécessaires au service (vérification de compte,
                réinitialisation de mot de passe, notifications que vous avez activées).
              </li>
            </ul>
            <p>Nous n’utilisons jamais vos données financières à des fins publicitaires.</p>
          </Section>

          <Section title="4. Qui peut accéder à vos données">
            <p>
              L’accès est limité par rôle : un Trésorier ne voit pas ce qu’un Auditeur voit
              ailleurs, un compte d’une annexe ne voit pas les autres annexes sauf en Vue
              Consolidée. Chaque action reste horodatée et attribuée à son auteur (piste d’audit).
            </p>
          </Section>

          <Section title="5. Avec qui nous les partageons">
            <p>
              Nous ne vendons aucune donnée. Certains prestataires techniques traitent des données
              en notre nom, strictement pour faire fonctionner le service :
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Hébergement de la base de données (infrastructure Postgres managée).</li>
              <li>Stockage des images (logos, photos de reçus).</li>
              <li>Envoi des emails transactionnels (vérification, notifications).</li>
              <li>Mise en cache et limitation du trafic, pour la sécurité du service.</li>
            </ul>
          </Section>

          <Section title="6. Combien de temps nous les conservons">
            <p>
              Vos données sont conservées tant que votre compte est actif. Les journaux techniques
              et les codes de vérification à usage unique sont automatiquement purgés après une
              courte durée. Vous pouvez demander la suppression complète de votre compte à tout
              moment.
            </p>
          </Section>

          <Section title="7. Vos droits">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Accès et export :</strong> exportez l’intégralité de vos écritures depuis
                l’application, à tout moment.
              </li>
              <li>
                <strong>Rectification :</strong> corrigez vos informations de compte depuis les
                paramètres.
              </li>
              <li>
                <strong>Suppression :</strong> demandez la fermeture de votre compte et l’effacement
                de vos données.
              </li>
              <li>
                <strong>Opposition :</strong> désinscrivez-vous des notifications non essentielles à
                tout moment.
              </li>
            </ul>
          </Section>

          <Section title="8. Cookies">
            <p>
              Goshen utilise uniquement des cookies nécessaires au fonctionnement du service : une
              session de connexion, un jeton de sécurité anti-falsification (CSRF), et vos
              préférences d’affichage. Aucun cookie publicitaire ou de traçage tiers n’est déposé.
            </p>
          </Section>

          <Section title="9. Sécurité">
            <p>
              Les mots de passe sont chiffrés, les échanges passent en connexion sécurisée (HTTPS),
              et l’accès est protégé par rôle. Voir aussi notre{' '}
              <Link href="/protection-des-donnees" className="text-emerald-800 underline">
                Politique de protection des données
              </Link>{' '}
              pour le détail des mesures techniques.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Pour toute question sur vos données ou pour exercer vos droits, contactez l’équipe via
              la{' '}
              <Link href="/#communaute" className="text-emerald-800 underline">
                communauté WhatsApp
              </Link>{' '}
              indiquée sur la page d’accueil, ou directement l’administrateur de votre église.
            </p>
          </Section>

          <Section title="11. Modifications">
            <p>
              Cette politique peut évoluer avec le produit. Toute modification importante sera
              annoncée dans l’application. La date de dernière mise à jour figure en haut de cette
              page.
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
