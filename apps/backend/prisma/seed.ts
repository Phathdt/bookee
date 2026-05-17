import 'reflect-metadata';
import { hash } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://bookee:bookee@localhost:5432/bookee?schema=public';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Placeholder hash for seed-only fixtures. Real auth flow uses bcryptjs. */
function fakeHash(password: string): string {
  return `seed$${hash('sha256', `${password}::bookee-seed`)}`;
}

const STATIONS = [
  {
    name: 'Bến xe Miền Đông Mới',
    address: 'Phú Hữu, Quận 9, TP.HCM',
    lat: 10.8412,
    lng: 106.808,
    city: 'TP.HCM',
  },
  {
    name: 'Bến xe Miền Tây',
    address: '395 Kinh Dương Vương, Bình Tân',
    lat: 10.7406,
    lng: 106.6181,
    city: 'TP.HCM',
  },
  {
    name: 'Bến xe Đà Lạt',
    address: '1 Tô Hiến Thành, Đà Lạt',
    lat: 11.9282,
    lng: 108.4357,
    city: 'Lâm Đồng',
  },
  {
    name: 'Bến xe Cần Thơ',
    address: 'Số 36 đường 3/2, Ninh Kiều',
    lat: 10.0341,
    lng: 105.7677,
    city: 'Cần Thơ',
  },
  {
    name: 'Bến xe Nha Trang',
    address: '23 Tháng 10, Nha Trang',
    lat: 12.2542,
    lng: 109.1839,
    city: 'Khánh Hòa',
  },
];

async function seedAdmin(): Promise<void> {
  await prisma.user.upsert({
    where: { email: 'admin@bookee.local' },
    update: {},
    create: {
      name: 'Bookee Admin',
      phone: '0900000000',
      email: 'admin@bookee.local',
      passwordHash: fakeHash('admin'),
      role: 'admin',
    },
  });
}

async function seedStations(): Promise<void> {
  for (const s of STATIONS) {
    const exists = await prisma.station.findFirst({ where: { name: s.name } });
    if (!exists) await prisma.station.create({ data: s });
  }
}

async function seedSeatLayouts(): Promise<void> {
  const sleeperExists = await prisma.seatLayout.findFirst({ where: { name: 'Giường nằm 34 chỗ' } });
  const sleeper =
    sleeperExists ??
    (await prisma.seatLayout.create({
      data: { name: 'Giường nằm 34 chỗ', rows: 6, cols: 3 },
    }));
  if ((await prisma.seat.count({ where: { layoutId: sleeper.id } })) === 0) {
    const seats: { layoutId: number; code: string; floor: number; row: number; col: number }[] = [];
    let count = 0;
    for (let floor = 1; floor <= 2; floor++) {
      const prefix = floor === 1 ? 'A' : 'B';
      for (let row = 1; row <= 6; row++) {
        for (let col = 1; col <= 3; col++) {
          if (count >= 34) break;
          seats.push({
            layoutId: sleeper.id,
            code: `${prefix}${String(row).padStart(2, '0')}${col}`,
            floor,
            row,
            col,
          });
          count++;
        }
      }
    }
    await prisma.seat.createMany({ data: seats });
  }

  const limousineExists = await prisma.seatLayout.findFirst({
    where: { name: 'Limousine 22 chỗ' },
  });
  const limousine =
    limousineExists ??
    (await prisma.seatLayout.create({
      data: { name: 'Limousine 22 chỗ', rows: 8, cols: 3 },
    }));
  if ((await prisma.seat.count({ where: { layoutId: limousine.id } })) === 0) {
    const seats: { layoutId: number; code: string; floor: number; row: number; col: number }[] = [];
    let n = 0;
    for (let row = 1; row <= 8 && n < 22; row++) {
      for (let col = 1; col <= 3 && n < 22; col++) {
        n++;
        seats.push({
          layoutId: limousine.id,
          code: `L${String(n).padStart(2, '0')}`,
          floor: 1,
          row,
          col,
        });
      }
    }
    await prisma.seat.createMany({ data: seats });
  }
}

const OPERATORS = [
  { name: 'Phương Trang', hotline: '19006067', status: 'active' as const },
  { name: 'Thành Bưởi', hotline: '19006079', status: 'active' as const },
  { name: 'Sao Việt', hotline: '19006888', status: 'active' as const },
];

/**
 * Routes seeded as pairs of [fromStationName, toStationName]. distanceKm +
 * durationMinutes are rough estimates — good enough for fixtures.
 */
const ROUTES: { from: string; to: string; distanceKm: number; durationMinutes: number }[] = [
  { from: 'Bến xe Miền Đông Mới', to: 'Bến xe Đà Lạt', distanceKm: 308, durationMinutes: 480 },
  { from: 'Bến xe Đà Lạt', to: 'Bến xe Miền Đông Mới', distanceKm: 308, durationMinutes: 480 },
  { from: 'Bến xe Miền Tây', to: 'Bến xe Cần Thơ', distanceKm: 165, durationMinutes: 240 },
  { from: 'Bến xe Cần Thơ', to: 'Bến xe Miền Tây', distanceKm: 165, durationMinutes: 240 },
  { from: 'Bến xe Miền Đông Mới', to: 'Bến xe Nha Trang', distanceKm: 440, durationMinutes: 600 },
  { from: 'Bến xe Nha Trang', to: 'Bến xe Đà Lạt', distanceKm: 135, durationMinutes: 210 },
];

async function seedOperators(): Promise<void> {
  for (const op of OPERATORS) {
    const exists = await prisma.busCompany.findFirst({ where: { name: op.name } });
    if (!exists) await prisma.busCompany.create({ data: op });
  }
}

async function seedRoutes(): Promise<void> {
  const operators = await prisma.busCompany.findMany({ orderBy: { id: 'asc' } });
  if (operators.length === 0) return;

  for (const r of ROUTES) {
    const from = await prisma.station.findFirst({ where: { name: r.from } });
    const to = await prisma.station.findFirst({ where: { name: r.to } });
    if (!from || !to) continue;

    // Round-robin: each route assigned to a different operator.
    const operator = operators[ROUTES.indexOf(r) % operators.length];
    if (!operator) continue;

    const exists = await prisma.route.findFirst({
      where: { companyId: operator.id, fromStationId: from.id, toStationId: to.id },
    });
    if (!exists) {
      await prisma.route.create({
        data: {
          companyId: operator.id,
          fromStationId: from.id,
          toStationId: to.id,
          distanceKm: r.distanceKm,
          durationMinutes: r.durationMinutes,
        },
      });
    }
  }
}

async function seedVehicles(): Promise<void> {
  const operators = await prisma.busCompany.findMany({ orderBy: { id: 'asc' } });
  const sleeper = await prisma.seatLayout.findFirst({ where: { name: 'Giường nằm 34 chỗ' } });
  const limousine = await prisma.seatLayout.findFirst({ where: { name: 'Limousine 22 chỗ' } });
  if (!sleeper || !limousine || operators.length === 0) return;

  const layouts = [
    { layout: sleeper, totalSeats: 34, prefix: 'SLP' },
    { layout: limousine, totalSeats: 22, prefix: 'LMS' },
  ];

  for (const op of operators) {
    for (const cfg of layouts) {
      const plate = `${cfg.prefix}-${op.id}-001`;
      const exists = await prisma.vehicle.findFirst({ where: { plateNumber: plate } });
      if (!exists) {
        await prisma.vehicle.create({
          data: {
            companyId: op.id,
            plateNumber: plate,
            type: cfg.prefix === 'SLP' ? 'sleeper' : 'limousine',
            seatLayoutId: cfg.layout.id,
            totalSeats: cfg.totalSeats,
          },
        });
      }
    }
  }
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedStations();
  await seedSeatLayouts();
  await seedOperators();
  await seedRoutes();
  await seedVehicles();
  // eslint-disable-next-line no-console
  console.log('[seed] done — admin, 5 stations, 2 seat layouts, 3 operators, 6 routes, 6 vehicles');
}

main()
  .catch((e) => {
    console.error('[seed] failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
