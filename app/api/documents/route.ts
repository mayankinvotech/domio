import { NextResponse } from 'next/server';
import type { DocumentType, EntityType } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveEditAccess } from '@/lib/manager-access';
import { uploadToR2 } from '@/lib/r2';
import { generateDocumentId } from '@/lib/display-ids';
import { isValidMimeType, MAX_FILE_SIZE } from '@/lib/document-types';

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'LEASE_AGREEMENT',
  'PROPERTY_DEED',
  'INSURANCE',
  'INSPECTION_REPORT',
  'UTILITY_AGREEMENT',
  'TENANT_ID',
  'BANK_STATEMENT',
  'LEGAL',
  'OTHER',
];
const VALID_ENTITY_TYPES: EntityType[] = ['PORTFOLIO', 'PROPERTY', 'SUB_PROPERTY', 'TENANT'];

// Verify the linked entity belongs to this owner, and (for managers) that they
// have edit access to it. Returns the property/sub-property id to check
// manager access against, or null when the check doesn't apply (portfolio,
// tenant — managers cannot upload documents for those).
async function verifyEntityOwnership(
  ownerId: string,
  entityType: EntityType,
  entityId: string,
): Promise<boolean> {
  switch (entityType) {
    case 'PORTFOLIO': {
      const p = await prisma.portfolio.findFirst({ where: { id: entityId, ownerId } });
      return !!p;
    }
    case 'PROPERTY': {
      const p = await prisma.property.findFirst({ where: { id: entityId, ownerId } });
      return !!p;
    }
    case 'SUB_PROPERTY': {
      const u = await prisma.subProperty.findFirst({ where: { id: entityId, ownerId } });
      return !!u;
    }
    case 'TENANT': {
      const t = await prisma.tenant.findFirst({ where: { id: entityId, ownerId } });
      return !!t;
    }
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = form.get('file');
  const name = String(form.get('name') ?? '').trim();
  const documentType = form.get('documentType') as DocumentType;
  const description = String(form.get('description') ?? '').trim();
  const entityType = form.get('entityType') as EntityType;
  const entityId = String(form.get('entityId') ?? '');
  const expiryDateRaw = form.get('expiryDate');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'A document name is required.' }, { status: 400 });
  }
  if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
    return NextResponse.json({ error: 'A valid document type is required.' }, { status: 400 });
  }
  if (!VALID_ENTITY_TYPES.includes(entityType) || !entityId) {
    return NextResponse.json(
      { error: 'Please choose what to link this document to.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File is too large (max 10MB).' }, { status: 400 });
  }
  if (!isValidMimeType(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
  }

  if (ds.isManager) {
    if (entityType === 'PORTFOLIO' || entityType === 'TENANT') {
      return NextResponse.json(
        { error: 'Managers cannot upload documents at this level.' },
        { status: 403 },
      );
    }
    const access = await resolveEditAccess(session.user, {
      propertyId: entityType === 'PROPERTY' ? entityId : undefined,
      subPropertyId: entityType === 'SUB_PROPERTY' ? entityId : undefined,
    });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const owns = await verifyEntityOwnership(ds.ownerId, entityType, entityId);
  if (!owns) {
    return NextResponse.json({ error: 'Linked item not found.' }, { status: 404 });
  }

  let expiryDate: Date | null = null;
  if (typeof expiryDateRaw === 'string' && expiryDateRaw.trim()) {
    const d = new Date(expiryDateRaw);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'A valid expiry date is required.' }, { status: 400 });
    }
    expiryDate = d;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey = `documents/${ds.ownerId}/${Date.now()}-${safeName}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(fileKey, buffer, file.type);

    const displayId = await generateDocumentId().catch(() => null);
    const document = await prisma.document.create({
      data: {
        displayId,
        ownerId: ds.ownerId,
        name,
        description: description || null,
        documentType,
        fileKey,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        expiryDate,
        entityType,
        entityId,
      },
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error('Failed to upload document:', err);
    return NextResponse.json(
      { error: 'Failed to upload document. Please try again.' },
      { status: 500 },
    );
  }
}
