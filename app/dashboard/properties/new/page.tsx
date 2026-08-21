import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { resolveDataScope } from '@/lib/manager-access';
import { listPortfoliosForOwner } from '@/lib/portfolios';

export default async function GenericNewPropertyPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ds = await resolveDataScope(session.user);
  const portfolios = await listPortfoliosForOwner(ds.ownerId);

  if (portfolios.length > 0) {
    redirect(`/dashboard/portfolios/${portfolios[0].id}/properties/new`);
  } else {
    redirect('/dashboard/portfolios/new');
  }
}
