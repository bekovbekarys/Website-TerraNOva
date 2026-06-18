import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-serif text-6xl font-bold text-terra-700">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-stone-600">
        The page or preprint you&apos;re looking for doesn&apos;t exist, or
        isn&apos;t publicly available.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary">
          Back home
        </Link>
        <Link href="/browse" className="btn-secondary">
          Browse preprints
        </Link>
      </div>
    </div>
  );
}
