import dynamicImport from "next/dynamic";

const HomePageClient = dynamicImport(() => import("@/components/home-page-client"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomePageClient />;
}