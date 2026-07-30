import { redirect } from 'next/navigation';

interface VerifyPageProps {
  params: { shipmentId: string };
}

export default function VerifyRedirectPage({ params }: VerifyPageProps) {
  redirect(`/hospital/verify?shipment=${encodeURIComponent(params.shipmentId)}`);
}
