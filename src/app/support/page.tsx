import Link from "next/link";
import { AralSeaArt } from "@/components/AralSeaArt";
import { SITE_NAME, SUPPORT_FUND } from "@/lib/constants";

export const metadata = {
  title: "Support the Aral Sea",
  description: `Support the ${SUPPORT_FUND.name} (${SUPPORT_FUND.shortName}) — restoring one of the world's gravest environmental disasters in Central Asia.`,
};

const impactCards = [
  {
    title: "An environmental catastrophe",
    body: "Once the world's fourth-largest lake, the Aral Sea has lost the vast majority of its volume since the 1960s after its feeding rivers were diverted for irrigation, leaving exposed seabed, toxic dust storms, and collapsed fisheries.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    ),
  },
  {
    title: "Communities at the front line",
    body: "Millions of people across Kazakhstan, Uzbekistan, and the wider region face water scarcity, salinised soils, and public-health impacts. Restoration work directly supports livelihoods and food security.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    ),
  },
  {
    title: "Restoration that works",
    body: "Coordinated action — like the Kok-Aral dam on the North Aral Sea — has already brought water and fish back to parts of the basin, proving that recovery is possible with sustained support.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.96 8.96 0 0 0 3.5-.7M12 3a8.96 8.96 0 0 1 0 18M3.6 9h16.8M3.6 15h16.8"
      />
    ),
  },
];

export default function SupportPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ocean-700 via-ocean-800 to-terra-950 text-white">
        <div
          className="absolute inset-0 opacity-30 [animation:drift_18s_ease-in-out_infinite]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 28%, #1aa6ff 0, transparent 42%), radial-gradient(circle at 82% 18%, #54ad7f 0, transparent 38%), radial-gradient(circle at 65% 95%, #8acca8 0, transparent 45%)",
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-1/2 hidden h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-gradient-to-tr from-ocean-500/30 to-terra-300/20 blur-2xl lg:block" />

        <div className="container-page relative py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
            <div className="max-w-2xl animate-fade-up">
              <span className="badge bg-white/10 text-terra-50 ring-1 ring-inset ring-white/20 backdrop-blur">
                {SUPPORT_FUND.region}
              </span>
              <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] text-white sm:text-5xl">
                Help save the Aral Sea
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-terra-50/90">
                {SITE_NAME} stands for the Earth system we study. We invite our
                community to support the{" "}
                <strong className="font-semibold text-white">
                  {SUPPORT_FUND.name}
                </strong>{" "}
                ({SUPPORT_FUND.shortName}) — the intergovernmental fund leading
                restoration of one of the planet&apos;s most severe human-made
                environmental disasters.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={SUPPORT_FUND.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-white text-ocean-800 shadow-lg hover:bg-terra-50"
                >
                  Donate &amp; learn more at ecifas.kz →
                </a>
                <Link
                  href="/browse?subject=Hydrology"
                  className="btn border border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/10"
                >
                  Read related research
                </Link>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative hidden justify-center lg:flex">
              <AralSeaArt className="w-full max-w-[24rem] animate-fade-up drop-shadow-2xl" />
            </div>
          </div>
        </div>

        {/* Mountain-ridge transition into the page */}
        <div className="relative" aria-hidden="true">
          <svg
            viewBox="0 0 1440 130"
            preserveAspectRatio="none"
            className="block h-[54px] w-full sm:h-[88px]"
          >
            <path
              d="M0 130V86l160-26 170 30 175-44 180 40 165-34 170 36 150-26 140 30V130Z"
              fill="#f5f5f4"
            />
            <path
              d="M0 130V104l140-22 165 26 175-34 165 32 175-30 160 30 155-22 140 22V130Z"
              fill="#fafaf9"
            />
          </svg>
        </div>
      </section>

      {/* Why it matters */}
      <section className="container-page py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-terra-700">
            Why this cause
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Science is only the start. Action saves ecosystems.
          </h2>
          <p className="mt-3 text-stone-600">
            The Aral Sea crisis is a textbook case in environmental science — and
            a living one. Supporting the fund turns research and awareness into
            on-the-ground recovery.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {impactCards.map((item) => (
            <div
              key={item.title}
              className="card p-6 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ocean-100 text-ocean-700">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.6}
                  stroke="currentColor"
                >
                  {item.icon}
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About the fund */}
      <section className="border-t border-stone-200 bg-white py-14">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold">
            About the {SUPPORT_FUND.shortName}
          </h2>
          <div className="prose-abstract mt-4 space-y-4 text-stone-700">
            <p>
              The {SUPPORT_FUND.name} was founded in 1993 by Kazakhstan,
              Uzbekistan, Tajikistan, Kyrgyzstan, and Turkmenistan to fund and
              coordinate joint projects that ease the social, economic, and
              ecological consequences of the Aral Sea&apos;s shrinkage.
            </p>
            <p>
              Its Executive Committee implements basin-wide programmes — improving
              water management, restoring habitats, and supporting the communities
              who depend on the basin. Contributions and partnerships help sustain
              this long-term work.
            </p>
            <p className="text-sm text-stone-500">
              {SITE_NAME} is an independent preprint server and is not affiliated
              with the {SUPPORT_FUND.shortName}. We link to the fund&apos;s
              official website so you can learn more and contribute directly.
            </p>
          </div>

          <div className="mt-8">
            <a
              href={SUPPORT_FUND.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Visit ecifas.kz →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
