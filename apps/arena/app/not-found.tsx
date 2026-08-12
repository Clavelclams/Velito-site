export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-black text-arena-violet">404</p>
      <h1 className="mt-4 text-xl font-bold">Cette page n&apos;existe pas</h1>
      <p className="mt-2 text-sm text-arena-muted">
        Le tournoi a peut-être été retiré, ou le lien est incomplet.
      </p>
      <a
        href="/"
        className="mt-6 inline-block rounded-lg bg-arena-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-arena-violet-fonce"
      >
        Retour aux tournois
      </a>
    </div>
  );
}
