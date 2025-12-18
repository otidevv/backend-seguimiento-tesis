import { PrismaClient, RoleEnum, PermissionAction } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

/**
 * Script para actualizar/crear módulos y permisos sin afectar otros datos
 * Uso: npx ts-node src/database/seeds/seed-modules.ts
 */
async function seedModules() {
  try {
    console.log('✅ Conectando a la base de datos...');

    // Obtener roles existentes
    const adminRole = await prisma.role.findUnique({ where: { name: RoleEnum.ADMIN } });
    const coordinadorRole = await prisma.role.findUnique({ where: { name: RoleEnum.COORDINADOR } });
    const docenteRole = await prisma.role.findUnique({ where: { name: RoleEnum.DOCENTE } });
    const estudianteRole = await prisma.role.findUnique({ where: { name: RoleEnum.ESTUDIANTE } });

    if (!adminRole || !coordinadorRole || !docenteRole || !estudianteRole) {
      console.error('❌ Error: Faltan roles. Ejecuta primero el seed principal.');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('📝 Limpiando módulos y permisos existentes...');
    // Eliminar permisos existentes
    await prisma.roleModulePermission.deleteMany({});
    // Eliminar módulos existentes
    await prisma.module.deleteMany({});

    console.log('\n📝 Creando módulos del sistema...');
    // ============ MÓDULOS DEL SISTEMA ============
    const moduleDashboard = await prisma.module.create({
      data: {
        name: 'dashboard',
        displayName: 'Dashboard',
        description: 'Panel principal con estadísticas y resumen',
        icon: 'dashboard',
        route: '/dashboard',
        order: 1,
      },
    });
    console.log(`✅ Módulo creado: ${moduleDashboard.displayName}`);

    const moduleMyThesis = await prisma.module.create({
      data: {
        name: 'my-thesis',
        displayName: 'Mis Tesis',
        description: 'Gestión de mis proyectos de tesis',
        icon: 'file-description',
        route: '/dashboard/mis-tesis',
        order: 2,
      },
    });
    console.log(`✅ Módulo creado: ${moduleMyThesis.displayName}`);

    const moduleAdvisees = await prisma.module.create({
      data: {
        name: 'advisees',
        displayName: 'Mis Asesorados',
        description: 'Estudiantes bajo mi asesoría',
        icon: 'user-star',
        route: '/dashboard/mis-asesorados',
        order: 3,
      },
    });
    console.log(`✅ Módulo creado: ${moduleAdvisees.displayName}`);

    const moduleTheses = await prisma.module.create({
      data: {
        name: 'theses',
        displayName: 'Gestión de Tesis',
        description: 'Administración de proyectos de tesis',
        icon: 'file-description',
        route: '/dashboard/tesis',
        order: 4,
      },
    });
    console.log(`✅ Módulo creado: ${moduleTheses.displayName}`);

    const moduleReviews = await prisma.module.create({
      data: {
        name: 'reviews',
        displayName: 'Revisiones',
        description: 'Evaluación de tesis como jurado',
        icon: 'checklist',
        route: '/dashboard/revisiones',
        order: 5,
      },
    });
    console.log(`✅ Módulo creado: ${moduleReviews.displayName}`);

    const moduleUsers = await prisma.module.create({
      data: {
        name: 'users',
        displayName: 'Usuarios',
        description: 'Administración de usuarios del sistema',
        icon: 'users',
        route: '/dashboard/usuarios',
        order: 6,
      },
    });
    console.log(`✅ Módulo creado: ${moduleUsers.displayName}`);

    const modulePermissions = await prisma.module.create({
      data: {
        name: 'permissions',
        displayName: 'Permisos',
        description: 'Gestión de permisos y módulos del sistema',
        icon: 'shield-check',
        route: '/dashboard/permisos',
        order: 7,
      },
    });
    console.log(`✅ Módulo creado: ${modulePermissions.displayName}`);

    const moduleFaculties = await prisma.module.create({
      data: {
        name: 'faculties',
        displayName: 'Facultades',
        description: 'Gestión de facultades',
        icon: 'building',
        route: '/dashboard/facultades',
        order: 8,
      },
    });
    console.log(`✅ Módulo creado: ${moduleFaculties.displayName}`);

    const moduleCareers = await prisma.module.create({
      data: {
        name: 'careers',
        displayName: 'Carreras',
        description: 'Gestión de carreras',
        icon: 'school',
        route: '/dashboard/carreras',
        order: 9,
      },
    });
    console.log(`✅ Módulo creado: ${moduleCareers.displayName}`);

    const moduleEnrollments = await prisma.module.create({
      data: {
        name: 'enrollments',
        displayName: 'Inscripciones',
        description: 'Gestión de inscripciones de estudiantes',
        icon: 'clipboard-list',
        route: '/dashboard/inscripciones',
        order: 10,
      },
    });
    console.log(`✅ Módulo creado: ${moduleEnrollments.displayName}`);

    const moduleDeadlines = await prisma.module.create({
      data: {
        name: 'deadlines',
        displayName: 'Plazos',
        description: 'Gestión de plazos y fechas límite',
        icon: 'calendar-event',
        route: '/dashboard/plazos',
        order: 11,
      },
    });
    console.log(`✅ Módulo creado: ${moduleDeadlines.displayName}`);

    const moduleReports = await prisma.module.create({
      data: {
        name: 'reports',
        displayName: 'Reportes',
        description: 'Reportes y estadísticas del sistema',
        icon: 'report-analytics',
        route: '/dashboard/reportes',
        order: 12,
      },
    });
    console.log(`✅ Módulo creado: ${moduleReports.displayName}`);

    console.log('\n📝 Asignando permisos a roles...');
    // ============ PERMISOS POR ROL ============

    // ADMIN: Acceso total a todos los módulos
    const adminModules = [
      moduleDashboard, moduleUsers, modulePermissions, moduleFaculties,
      moduleCareers, moduleEnrollments, moduleTheses, moduleDeadlines, moduleReports
    ];
    for (const module of adminModules) {
      await prisma.roleModulePermission.create({
        data: { roleId: adminRole.id, moduleId: module.id, action: PermissionAction.MANAGE },
      });
    }
    console.log(`✅ Permisos ADMIN asignados (${adminModules.length} módulos con MANAGE)`);

    // COORDINADOR: Dashboard, Tesis (gestión), Carreras, Inscripciones, Plazos, Reportes, Revisiones
    const coordinadorPermissions = [
      { moduleId: moduleDashboard.id, action: PermissionAction.READ },
      { moduleId: moduleTheses.id, action: PermissionAction.MANAGE },
      { moduleId: moduleCareers.id, action: PermissionAction.READ },
      { moduleId: moduleEnrollments.id, action: PermissionAction.MANAGE },
      { moduleId: moduleDeadlines.id, action: PermissionAction.MANAGE },
      { moduleId: moduleReports.id, action: PermissionAction.READ },
      { moduleId: moduleReviews.id, action: PermissionAction.MANAGE },
    ];
    for (const perm of coordinadorPermissions) {
      await prisma.roleModulePermission.create({
        data: { roleId: coordinadorRole.id, moduleId: perm.moduleId, action: perm.action },
      });
    }
    console.log(`✅ Permisos COORDINADOR asignados (${coordinadorPermissions.length} permisos)`);

    // DOCENTE: Dashboard, Asesorados, Revisiones, Tesis (ver)
    const docentePermissions = [
      { moduleId: moduleDashboard.id, action: PermissionAction.READ },
      { moduleId: moduleAdvisees.id, action: PermissionAction.MANAGE },
      { moduleId: moduleReviews.id, action: PermissionAction.MANAGE },
      { moduleId: moduleTheses.id, action: PermissionAction.READ },
    ];
    for (const perm of docentePermissions) {
      await prisma.roleModulePermission.create({
        data: { roleId: docenteRole.id, moduleId: perm.moduleId, action: perm.action },
      });
    }
    console.log(`✅ Permisos DOCENTE asignados (${docentePermissions.length} permisos)`);

    // ESTUDIANTE: Dashboard, Mi Tesis
    const estudiantePermissions = [
      { moduleId: moduleDashboard.id, action: PermissionAction.READ },
      { moduleId: moduleMyThesis.id, action: PermissionAction.MANAGE },
    ];
    for (const perm of estudiantePermissions) {
      await prisma.roleModulePermission.create({
        data: { roleId: estudianteRole.id, moduleId: perm.moduleId, action: perm.action },
      });
    }
    console.log(`✅ Permisos ESTUDIANTE asignados (${estudiantePermissions.length} permisos)`);

    console.log('\n✅ Módulos y permisos actualizados exitosamente!');
    console.log('\n📋 Permisos por rol:');
    console.log('  ADMIN: Dashboard, Usuarios, Permisos, Facultades, Carreras, Inscripciones, Tesis, Plazos, Reportes');
    console.log('  COORDINADOR: Dashboard, Tesis, Carreras, Inscripciones, Plazos, Reportes, Revisiones');
    console.log('  DOCENTE: Dashboard, Mis Asesorados, Revisiones, Gestión de Tesis (ver)');
    console.log('  ESTUDIANTE: Dashboard, Mis Tesis');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedModules();
