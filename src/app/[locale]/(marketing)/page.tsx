import { getServerSession } from "@/modules/server/auth/get-session";
import RootNavbar from "@/modules/client/(marketing)/components/RootNavbar";
import Hero from "@/modules/client/(marketing)/components/Hero";
import Features from "@/modules/client/(marketing)/components/Features";
import HowItWorks from "@/modules/client/(marketing)/components/HowItWorks";
import Testimonials from "@/modules/client/(marketing)/components/Testimonials";
import Cta from "@/modules/client/(marketing)/components/Cta";
import Footer from "@/modules/client/(marketing)/components/Footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession();

  return (
    <>
      <RootNavbar session={session} />
      <main>
        <Hero session={session} />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Cta session={session} />
      </main>
      <Footer />
    </>
  );
}
