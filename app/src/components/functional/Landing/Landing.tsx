import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ComoFunciona } from './ComoFunciona';
import { DemoCta } from './DemoCta';
import { Hero } from './Hero';
import { Integracion } from './Integracion';
import { Seguridad } from './Seguridad';
import { Tecnologia } from './Tecnologia';

export function Landing() {
  return (
    <div className="text-[17px] leading-[1.6]">
      <SiteHeader />
      <main>
        <Hero />
        <ComoFunciona />
        <Tecnologia />
        <Seguridad />
        <Integracion />
        <DemoCta />
      </main>
      <SiteFooter />
    </div>
  );
}
