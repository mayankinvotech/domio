import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, location, password, role = 'OWNER', ref } = body;

    // Check if referred by an agent
    let referredByAgentId: string | null = null;
    if (ref && typeof ref === 'string' && ref.trim()) {
      const agent = await prisma.agent.findUnique({
        where: { inviteCode: ref.trim().toUpperCase() },
      });
      if (agent) {
        referredByAgentId = agent.id;
      }
    }

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long.' },
        { status: 400 },
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    if (!phone || typeof phone !== 'string' || phone.trim().replace(/\D/g, '').length < 8) {
      return NextResponse.json(
        { error: 'A valid phone number is mandatory for account creation.' },
        { status: 400 },
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 },
      );
    }

    const validRoles: Role[] = ['OWNER', 'RENTER', 'BOTH'];
    const chosenRole: Role = validRoles.includes(role as Role)
      ? (role as Role)
      : 'OWNER';

    const normalisedEmail = email.toLowerCase().trim();
    const cleanDigits = phone.trim().replace(/\D/g, '');
    const formattedPhone = phone.trim().startsWith('+') ? phone.trim() : `+${cleanDigits}`;
    const trimmedLocation = location ? String(location).trim() : null;

    // Check if user with this email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalisedEmail },
          { phone: formattedPhone },
          { phone: phone.trim() },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.email === normalisedEmail ? 'An account with this email already exists.' : 'An account with this phone number already exists.' },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique accountId
    const year = new Date().getFullYear();
    const count = await prisma.user.count();
    const accountId = `DMO-${year}-${String(count + 1).padStart(5, '0')}`;

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalisedEmail,
        phone: formattedPhone,
        location: trimmedLocation,
        password: hashedPassword,
        role: chosenRole,
        accountId,
        referredByAgentId,
        active: true,
      },
    });

    // If role is OWNER or BOTH: initialize default portfolio for them
    if (chosenRole === 'OWNER' || chosenRole === 'BOTH') {
      await prisma.portfolio.create({
        data: {
          name: `${name.trim()}'s Portfolio`,
          type: 'RESIDENTIAL',
          description: 'Default portfolio for properties',
          ownerId: newUser.id,
          displayId: `PF-${String(count + 1).padStart(4, '0')}`,
        },
      });
    }

    // If role is RENTER or BOTH: initialize tenant profile
    if (chosenRole === 'RENTER' || chosenRole === 'BOTH') {
      const tenantCount = await prisma.tenant.count();
      const username = normalisedEmail.split('@')[0] + '_' + Math.floor(100 + Math.random() * 900);
      
      await prisma.tenant.create({
        data: {
          displayId: `TN-${String(tenantCount + 1).padStart(4, '0')}`,
          name: name.trim(),
          email: normalisedEmail,
          phone: formattedPhone,
          location: trimmedLocation,
          username,
          password: hashedPassword,
          portalEnabled: true,
          selfRegistered: true,
          userId: newUser.id,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account registered successfully.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error?.message || 'Something went wrong during registration.' },
      { status: 500 },
    );
  }
}
