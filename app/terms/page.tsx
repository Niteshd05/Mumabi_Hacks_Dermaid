'use client';

import { MobileContainer, TopBar } from '@/components/layout';

export default function TermsPage() {
  return (
    <>
      <TopBar />
      <MobileContainer className="px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground">Version v1 · Last updated: Today</p>

        <section className="space-y-3 text-sm leading-6">
          <p>
            DermAid provides informational guidance to support cosmetic care and general skin health. DermAid does
            not provide medical diagnosis or treatment. Always consult a licensed clinician for medical concerns.
          </p>
          <p>
            By using DermAid you consent to processing the data you provide (including camera images during scans)
            to deliver personalized recommendations. Data is handled per our privacy practices and platform policies.
          </p>
          <p>
            You agree not to misuse the service, and you acknowledge that recommendations are suggestions only and
            may not be suitable for everyone. If you experience irritation or worsening symptoms, stop using any
            suggested product and seek professional help.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">Your Consent</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You accept these Terms & Conditions.</li>
            <li>You consent to data processing for personalization and product guidance.</li>
            <li>You acknowledge DermAid is not a medical device and does not diagnose.</li>
          </ul>
        </section>

        <section className="text-xs text-muted-foreground">
          <p>
            For questions about these terms, contact support at: support@dermaid.example (placeholder).
          </p>
        </section>
      </MobileContainer>
    </>
  );
}
