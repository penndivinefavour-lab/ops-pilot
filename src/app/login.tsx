import { redirect } from 'next/navigation';

export async function generateMetadata() {
  return { redirect: '/activity' };
}

export default function RedirectPage() {
  return null;
}
