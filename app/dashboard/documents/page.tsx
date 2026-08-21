import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listDocumentsForOwner } from '@/lib/documents';
import { getOwnerStructure } from '@/lib/expenses';
import { listTenantsForOwner } from '@/lib/tenants';
import { resolveDataScope } from '@/lib/manager-access';
import DocumentsVault from './documents-vault';

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ds = await resolveDataScope(session.user);
  const ownerId = ds.ownerId;
  const scope = ds.isManager ? ds.scope : undefined;
  // Owners + managers with any EDIT grant can upload/delete.
  const canManage =
    !ds.isManager ||
    ds.scope.editPropertyIds.size > 0 ||
    ds.scope.editSubPropertyIds.size > 0;

  const [documents, structure, tenants] = await Promise.all([
    listDocumentsForOwner(ownerId, { scope }),
    getOwnerStructure(ownerId),
    listTenantsForOwner(
      ownerId,
      ds.isManager ? ds.scope.subPropertyIds : undefined,
    ),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DocumentsVault
        documents={documents}
        structure={structure}
        tenants={tenants.map((t) => ({ id: t.id, name: t.name }))}
        canManage={canManage}
      />
    </div>
  );
}
