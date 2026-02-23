/**
 * Seed: create super admin + two approved hospitals and users for testing.
 * Run with: npx prisma db seed
 * Login with email + password "password123" for any seed user.
 * Super admin: superadmin@medsupply.com — can approve new hospitals.
 */

import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SEED_PASSWORD = 'password123';
const SUPER_ADMIN_EMAIL = 'superadmin@medsupply.com';

async function main() {
  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: { passwordHash: await hash(SEED_PASSWORD, 10) },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash: await hash(SEED_PASSWORD, 10),
      role: 'SUPER_ADMIN',
      organizationId: null,
    },
  });
  console.log('Super admin:', superAdmin.email);

  const hospitalA = await prisma.organization.upsert({
    where: { id: 'seed-hospital-a' },
    update: { status: 'APPROVED' },
    create: {
      id: 'seed-hospital-a',
      name: 'City General Hospital',
      status: 'APPROVED',
      inviteCode: 'SEEDHOSP1',
    },
  });
  const hospitalB = await prisma.organization.upsert({
    where: { id: 'seed-hospital-b' },
    update: { status: 'APPROVED' },
    create: {
      id: 'seed-hospital-b',
      name: 'Metro Medical Center',
      status: 'APPROVED',
      inviteCode: 'SEEDHOSP2',
    },
  });
  const hospitalC = await prisma.organization.upsert({
    where: { id: 'seed-hospital-c' },
    update: { status: 'APPROVED' },
    create: {
      id: 'seed-hospital-c',
      name: 'Riverside Community Hospital',
      status: 'APPROVED',
      inviteCode: 'SEEDHOSP3',
    },
  });
  const hospitalD = await prisma.organization.upsert({
    where: { id: 'seed-hospital-d' },
    update: { status: 'APPROVED' },
    create: {
      id: 'seed-hospital-d',
      name: 'Valley Health Medical',
      status: 'APPROVED',
      inviteCode: 'SEEDHOSP4',
    },
  });

  const passwordHash = await hash(SEED_PASSWORD, 10);
  const adminA = await prisma.user.upsert({
    where: { email: 'admin@hospital-a.com' },
    update: { passwordHash },
    create: {
      email: 'admin@hospital-a.com',
      passwordHash,
      role: 'ADMIN',
      organizationId: hospitalA.id,
    },
  });
  const procA = await prisma.user.upsert({
    where: { email: 'procurement@hospital-a.com' },
    update: { passwordHash },
    create: {
      email: 'procurement@hospital-a.com',
      passwordHash,
      role: 'PROCUREMENT',
      organizationId: hospitalA.id,
    },
  });
  const adminB = await prisma.user.upsert({
    where: { email: 'admin@hospital-b.com' },
    update: { passwordHash },
    create: {
      email: 'admin@hospital-b.com',
      passwordHash,
      role: 'ADMIN',
      organizationId: hospitalB.id,
    },
  });
  const procB = await prisma.user.upsert({
    where: { email: 'procurement@hospital-b.com' },
    update: { passwordHash },
    create: {
      email: 'procurement@hospital-b.com',
      passwordHash,
      role: 'PROCUREMENT',
      organizationId: hospitalB.id,
    },
  });
  const adminC = await prisma.user.upsert({
    where: { email: 'admin@hospital-c.com' },
    update: { passwordHash },
    create: {
      email: 'admin@hospital-c.com',
      passwordHash,
      role: 'ADMIN',
      organizationId: hospitalC.id,
    },
  });
  const procC = await prisma.user.upsert({
    where: { email: 'procurement@hospital-c.com' },
    update: { passwordHash },
    create: {
      email: 'procurement@hospital-c.com',
      passwordHash,
      role: 'PROCUREMENT',
      organizationId: hospitalC.id,
    },
  });
  const adminD = await prisma.user.upsert({
    where: { email: 'admin@hospital-d.com' },
    update: { passwordHash },
    create: {
      email: 'admin@hospital-d.com',
      passwordHash,
      role: 'ADMIN',
      organizationId: hospitalD.id,
    },
  });
  const procD = await prisma.user.upsert({
    where: { email: 'procurement@hospital-d.com' },
    update: { passwordHash },
    create: {
      email: 'procurement@hospital-d.com',
      passwordHash,
      role: 'PROCUREMENT',
      organizationId: hospitalD.id,
    },
  });

  const defaultCategories = ['Consumables', 'Equipment', 'Medicine', 'Reusable'];
  for (const name of defaultCategories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Categories:', defaultCategories.join(', '));

  // Dummy listings for all hospitals so every user can see items to buy (marketplace)
  const approvedOrgs = await prisma.organization.findMany({
    where: { status: 'APPROVED' },
    select: { id: true },
  });
  const hospitalIds = approvedOrgs.length > 0 ? approvedOrgs.map((o) => o.id) : [hospitalA.id, hospitalB.id, hospitalC.id, hospitalD.id];
  const productTitles = [
    'Surgical Gloves Box', 'Nitrile Gloves 100pk', 'Face Masks 50pk', 'Syringes 10ml', 'Bandages Sterile',
    'Gauze Pads 4x4', 'IV Set', 'Catheter Foley', 'Suture Kit', 'Scalpel Blades', 'Blood Pressure Cuff',
    'Pulse Oximeter', 'Thermometer Digital', 'Stethoscope', 'Defibrillator Pad', 'ECG Electrodes',
    'Oxygen Mask', 'Nasal Cannula', 'Ventilator Circuit', 'Suction Catheter', 'Urine Bag', 'Bedpan',
    'Wheelchair Cushion', 'Walker', 'Crutches', 'Splint Set', 'Neck Brace', 'Knee Brace', 'Compression Stockings',
    'Insulin Syringes', 'Test Strips', 'Lancets', 'Alcohol Swabs', 'Hand Sanitizer', 'Disinfectant Wipes',
    'Specimen Container', 'Lab Tube', 'Culture Swab', 'Biohazard Bag', 'Sharps Container', 'Wound Dressing',
    'Tegaderm', 'Hydrocolloid', 'Foam Dressing', 'Surgical Tape', 'Cotton Balls', 'Tongue Depressor',
    'Exam Light', 'Otoscope', 'Ophthalmoscope', 'Reflex Hammer', 'Tuning Fork', 'Monitors', 'Pumps',
  ];
  const existingCount = await prisma.listing.count();
  const targetDummyCount = 600;
  if (existingCount < targetDummyCount) {
    const toCreate = targetDummyCount - existingCount;
    const batchSize = 100;
    let globalIndex = existingCount;
    for (let b = 0; b < Math.ceil(toCreate / batchSize); b++) {
      const batch: Array<{
        hospitalId: string;
        title: string;
        description: string | null;
        category: string;
        quantityAvailable: number;
        pricePerUnit: number;
        expiryDate: Date | null;
        status: string;
      }> = [];
      for (let i = 0; i < batchSize && globalIndex < existingCount + toCreate; i++) {
        const n = globalIndex + 1;
        batch.push({
          hospitalId: hospitalIds[globalIndex % hospitalIds.length],
          title: `${productTitles[globalIndex % productTitles.length]} #${n}`,
          description: `Surplus medical supply item ${n}. Suitable for clinical use.`,
          category: defaultCategories[globalIndex % defaultCategories.length],
          quantityAvailable: 10 + (globalIndex % 500),
          pricePerUnit: Number((5 + (globalIndex % 95) * 5.25).toFixed(2)),
          expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        });
        globalIndex++;
      }
      await prisma.listing.createMany({ data: batch });
    }
    const totalAfter = await prisma.listing.count();
    console.log('Dummy listings created. Total listings:', totalAfter);
  }

  console.log('Seed done. Login with email + password:', SEED_PASSWORD);
  console.log('Hospitals with listings:', hospitalIds.length, '—', hospitalIds.join(', '));
  console.log('Users (ADMIN / PROCUREMENT):');
  console.log('  Hospital A — admin@hospital-a.com, procurement@hospital-a.com');
  console.log('  Hospital B — admin@hospital-b.com, procurement@hospital-b.com');
  console.log('  Hospital C — admin@hospital-c.com, procurement@hospital-c.com');
  console.log('  Hospital D — admin@hospital-d.com, procurement@hospital-d.com');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
