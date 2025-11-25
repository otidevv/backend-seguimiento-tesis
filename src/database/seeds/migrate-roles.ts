import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function migrateRoles() {
  try {
    console.log('🔄 Migrando roles existentes...');

    // Check existing roles
    const roles = await prisma.role.findMany();
    console.log('Roles actuales:', roles.map((r) => r.name));

    // Update USER to ESTUDIANTE
    const userRole = await prisma.role.findFirst({
      where: { name: 'USER' as any },
    });

    if (userRole) {
      console.log('📝 Actualizando rol USER a ESTUDIANTE...');
      await prisma.$executeRaw`
        UPDATE roles SET name = 'ESTUDIANTE' WHERE name = 'USER'
      `;
      console.log('✅ Rol USER actualizado a ESTUDIANTE');
    }

    // Update MODERATOR to COORDINADOR
    const moderatorRole = await prisma.role.findFirst({
      where: { name: 'MODERATOR' as any },
    });

    if (moderatorRole) {
      console.log('📝 Actualizando rol MODERATOR a COORDINADOR...');
      await prisma.$executeRaw`
        UPDATE roles SET name = 'COORDINADOR' WHERE name = 'MODERATOR'
      `;
      console.log('✅ Rol MODERATOR actualizado a COORDINADOR');
    }

    // Create DOCENTE role if it doesn't exist
    const docenteRole = await prisma.role.findFirst({
      where: { name: 'DOCENTE' as any },
    });

    if (!docenteRole) {
      console.log('📝 Creando rol DOCENTE...');
      await prisma.$executeRaw`
        INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'DOCENTE', 'Docente/Asesor de tesis', NOW(), NOW())
      `;
      console.log('✅ Rol DOCENTE creado');
    }

    console.log('✅ Migración de roles completada');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error en migración de roles:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

migrateRoles();
