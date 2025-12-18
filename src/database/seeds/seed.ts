import { PrismaClient, RoleEnum, AcademicDegree, ThesisStatus, PermissionAction } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seed() {
  try {
    console.log('✅ Conectando a la base de datos...');

    // Check if roles already exist
    const existingRoles = await prisma.role.count();

    if (existingRoles > 0) {
      console.log('⚠️  Los datos ya existen. Saltando seed.');
      await prisma.$disconnect();
      return;
    }

    console.log('📝 Creando roles...');
    // Create default roles
    const adminRole = await prisma.role.create({
      data: {
        name: RoleEnum.ADMIN,
        description: 'Administrador con acceso total al sistema',
      },
    });
    console.log(`✅ Rol creado: ${adminRole.name}`);

    const coordinadorRole = await prisma.role.create({
      data: {
        name: RoleEnum.COORDINADOR,
        description: 'Coordinador de carrera que supervisa tesis',
      },
    });
    console.log(`✅ Rol creado: ${coordinadorRole.name}`);

    const docenteRole = await prisma.role.create({
      data: {
        name: RoleEnum.DOCENTE,
        description: 'Docente/Asesor de tesis',
      },
    });
    console.log(`✅ Rol creado: ${docenteRole.name}`);

    const estudianteRole = await prisma.role.create({
      data: {
        name: RoleEnum.ESTUDIANTE,
        description: 'Estudiante que desarrolla tesis',
      },
    });
    console.log(`✅ Rol creado: ${estudianteRole.name}`);

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

    console.log('\n📝 Creando facultades...');
    // Create faculties (datos reales de UNAMAD)
    const facultadIngenieria = await prisma.faculty.create({
      data: {
        name: 'Facultad de Ingeniería',
        code: 'IN',
        externalName: 'INGENIERIA', // Nombre exacto de la API externa
        description: 'Facultad de Ingeniería',
      },
    });
    console.log(`✅ Facultad creada: ${facultadIngenieria.name}`);

    const facultadCienciasEmpresariales = await prisma.faculty.create({
      data: {
        name: 'Facultad de Ciencias Empresariales',
        code: 'EA',
        externalName: 'CIENCIAS EMPRESARIALES', // Nombre exacto de la API externa
        description: 'Facultad de Ciencias Empresariales',
      },
    });
    console.log(`✅ Facultad creada: ${facultadCienciasEmpresariales.name}`);

    const facultadEducacion = await prisma.faculty.create({
      data: {
        name: 'Facultad de Educación',
        code: 'ED',
        externalName: 'EDUCACIÓN', // Nombre exacto de la API externa
        description: 'Facultad de Educación',
      },
    });
    console.log(`✅ Facultad creada: ${facultadEducacion.name}`);

    console.log('\n📝 Creando carreras...');
    // ============ CARRERAS DE INGENIERÍA ============
    const carreraInformatica = await prisma.career.create({
      data: {
        name: 'Ingeniería de Sistemas e Informática',
        code: 'IS',
        externalName: 'INGENIERÍA DE SISTEMAS E INFORMÁTICA',
        description: 'Carrera de Ingeniería de Sistemas e Informática',
        facultyId: facultadIngenieria.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraInformatica.name}`);

    const carreraAgroindustrial = await prisma.career.create({
      data: {
        name: 'Ingeniería Agroindustrial',
        code: 'IA',
        externalName: 'INGENIERÍA AGROINDUSTRIAL',
        description: 'Carrera de Ingeniería Agroindustrial',
        facultyId: facultadIngenieria.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraAgroindustrial.name}`);

    const carreraForestal = await prisma.career.create({
      data: {
        name: 'Ingeniería Forestal y Medio Ambiente',
        code: 'IF',
        externalName: 'INGENIERÍA FORESTAL Y MEDIO AMBIENTE',
        description: 'Carrera de Ingeniería Forestal y Medio Ambiente',
        facultyId: facultadIngenieria.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraForestal.name}`);

    const carreraVeterinaria = await prisma.career.create({
      data: {
        name: 'Medicina Veterinaria y Zootecnia',
        code: 'MV',
        externalName: 'MEDICINA VETERINARIA - ZOOTECNIA',
        description: 'Carrera de Medicina Veterinaria y Zootecnia',
        facultyId: facultadIngenieria.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraVeterinaria.name}`);

    // ============ CARRERAS DE CIENCIAS EMPRESARIALES ============
    const carreraContabilidad = await prisma.career.create({
      data: {
        name: 'Contabilidad y Finanzas',
        code: 'CF',
        externalName: 'CONTABILIDAD Y FINANZAS',
        description: 'Carrera de Contabilidad y Finanzas',
        facultyId: facultadCienciasEmpresariales.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraContabilidad.name}`);

    const carreraAdministracion = await prisma.career.create({
      data: {
        name: 'Administración y Negocios Internacionales',
        code: 'AN',
        externalName: 'ADMINISTRACIÓN Y NEGOCIOS INTERNACIONALES',
        description: 'Carrera de Administración y Negocios Internacionales',
        facultyId: facultadCienciasEmpresariales.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraAdministracion.name}`);

    const carreraEcoturismo = await prisma.career.create({
      data: {
        name: 'Ecoturismo',
        code: 'EC',
        externalName: 'ECOTURISMO',
        description: 'Carrera de Ecoturismo',
        facultyId: facultadCienciasEmpresariales.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraEcoturismo.name}`);

    // ============ CARRERAS DE EDUCACIÓN ============
    const carreraDerecho = await prisma.career.create({
      data: {
        name: 'Derecho y Ciencias Políticas',
        code: 'DC',
        externalName: 'DERECHO Y CIENCIAS POLÍTICAS',
        description: 'Carrera de Derecho y Ciencias Políticas',
        facultyId: facultadEducacion.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraDerecho.name}`);

    const carreraEducacionInicial = await prisma.career.create({
      data: {
        name: 'Educación Inicial y Especial',
        code: 'EI',
        externalName: 'EDUCACIÓN ESPECIALIDAD INICIAL Y ESPECIAL',
        description: 'Carrera de Educación Especialidad Inicial y Especial',
        facultyId: facultadEducacion.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraEducacionInicial.name}`);

    const carreraEducacionMatematica = await prisma.career.create({
      data: {
        name: 'Educación Matemática y Computación',
        code: 'EM',
        externalName: 'EDUCACIÓN ESPECIALIDAD MATEMÁTICA Y COMPUTACIÓN',
        description: 'Carrera de Educación Especialidad Matemática y Computación',
        facultyId: facultadEducacion.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraEducacionMatematica.name}`);

    const carreraEducacionPrimaria = await prisma.career.create({
      data: {
        name: 'Educación Primaria e Informática',
        code: 'EP',
        externalName: 'EDUCACIÓN ESPECIALIDAD PRIMARIA E INFORMÁTICA',
        description: 'Carrera de Educación Especialidad Primaria e Informática',
        facultyId: facultadEducacion.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraEducacionPrimaria.name}`);

    const carreraEnfermeria = await prisma.career.create({
      data: {
        name: 'Enfermería',
        code: 'EN',
        externalName: 'ENFERMERÍA',
        description: 'Carrera de Enfermería',
        facultyId: facultadEducacion.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraEnfermeria.name}`);

    console.log('\n📝 Creando usuarios de ejemplo...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@universidad.edu',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Sistema',
        documentNumber: '00000000',
        isEmailVerified: true,
        roles: {
          connect: { id: adminRole.id },
        },
      },
    });
    console.log(`✅ Usuario admin creado: ${adminUser.email}`);

    // Create docente/asesor
    const docente1 = await prisma.user.create({
      data: {
        email: 'docente1@universidad.edu',
        password: hashedPassword,
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        documentNumber: '11111111',
        phone: '+51999111111',
        isEmailVerified: true,
        roles: {
          connect: { id: docenteRole.id },
        },
      },
    });
    console.log(`✅ Docente creado: ${docente1.email}`);

    const docente2 = await prisma.user.create({
      data: {
        email: 'docente2@universidad.edu',
        password: hashedPassword,
        firstName: 'María',
        lastName: 'González',
        documentNumber: '22222222',
        phone: '+51999222222',
        isEmailVerified: true,
        roles: {
          connect: { id: docenteRole.id },
        },
      },
    });
    console.log(`✅ Docente creado: ${docente2.email}`);

    // Create coordinador
    const coordinador = await prisma.user.create({
      data: {
        email: 'coordinador@universidad.edu',
        password: hashedPassword,
        firstName: 'Ana',
        lastName: 'Martínez',
        documentNumber: '33333333',
        phone: '+51999333333',
        isEmailVerified: true,
        roles: {
          connect: { id: coordinadorRole.id },
        },
      },
    });
    console.log(`✅ Coordinador creado: ${coordinador.email}`);

    // Create estudiante que cursa 2 carreras (caso especial)
    const estudianteDobleCarrera = await prisma.user.create({
      data: {
        email: 'estudiante.doble@universidad.edu',
        password: hashedPassword,
        firstName: 'Juan',
        lastName: 'Pérez',
        documentNumber: '44444444',
        phone: '+51999444444',
        isEmailVerified: true,
        roles: {
          connect: { id: estudianteRole.id },
        },
      },
    });
    console.log(
      `✅ Estudiante (doble carrera) creado: ${estudianteDobleCarrera.email}`,
    );

    // Inscribir estudiante en 2 carreras (caso real de UNAMAD - doble carrera)
    await prisma.enrollment.create({
      data: {
        userId: estudianteDobleCarrera.id,
        careerId: carreraInformatica.id,
        studentCode: '13121013', // Código real de estudiante
      },
    });
    console.log('✅ Inscripción: Juan Pérez → Ingeniería de Sistemas e Informática');

    await prisma.enrollment.create({
      data: {
        userId: estudianteDobleCarrera.id,
        careerId: carreraContabilidad.id,
        studentCode: '20137013', // Código real de estudiante
      },
    });
    console.log('✅ Inscripción: Juan Pérez → Contabilidad y Finanzas');

    // Create estudiante normal
    const estudiante2 = await prisma.user.create({
      data: {
        email: 'estudiante2@universidad.edu',
        password: hashedPassword,
        firstName: 'Laura',
        lastName: 'Sánchez',
        documentNumber: '55555555',
        phone: '+51999555555',
        isEmailVerified: true,
        roles: {
          connect: { id: estudianteRole.id },
        },
      },
    });
    console.log(`✅ Estudiante creado: ${estudiante2.email}`);

    await prisma.enrollment.create({
      data: {
        userId: estudiante2.id,
        careerId: carreraDerecho.id,
        studentCode: 'DC2024001',
      },
    });
    console.log('✅ Inscripción: Laura Sánchez → Derecho y Ciencias Políticas');

    console.log('\n📝 Creando tesis de ejemplo...');
    // Create thesis for estudiante doble carrera (en Sistemas)
    const thesis1 = await prisma.thesis.create({
      data: {
        title:
          'Sistema de Gestión de Inventario con Machine Learning para Predicción de Demanda',
        description:
          'Desarrollo de un sistema web que utiliza algoritmos de ML para predecir la demanda de productos',
        academicDegree: AcademicDegree.LICENCIATURA,
        careerId: carreraInformatica.id,
        authorId: estudianteDobleCarrera.id,
        advisorId: docente1.id,
        status: ThesisStatus.EN_DESARROLLO,
      },
    });
    console.log(`✅ Tesis creada: ${thesis1.title.substring(0, 50)}...`);

    // Create milestones for thesis1
    await prisma.milestone.createMany({
      data: [
        {
          thesisId: thesis1.id,
          title: 'Propuesta de Tesis',
          description: 'Presentar y aprobar la propuesta de tesis',
          order: 1,
          isCompleted: true,
          completedAt: new Date('2024-01-15'),
        },
        {
          thesisId: thesis1.id,
          title: 'Marco Teórico',
          description: 'Completar el marco teórico y estado del arte',
          order: 2,
          isCompleted: true,
          completedAt: new Date('2024-03-01'),
        },
        {
          thesisId: thesis1.id,
          title: 'Desarrollo del Sistema',
          description: 'Implementar el sistema completo',
          order: 3,
          isCompleted: false,
          dueDate: new Date('2024-06-30'),
        },
        {
          thesisId: thesis1.id,
          title: 'Pruebas y Validación',
          description: 'Realizar pruebas del sistema y validar resultados',
          order: 4,
          isCompleted: false,
          dueDate: new Date('2024-08-15'),
        },
      ],
    });
    console.log('✅ Hitos creados para tesis 1');

    // Create thesis for estudiante2
    const thesis2 = await prisma.thesis.create({
      data: {
        title: 'Análisis del Marco Legal de la Protección Ambiental en la Amazonía Peruana',
        description:
          'Estudio jurídico sobre la normativa de protección ambiental en la región amazónica',
        academicDegree: AcademicDegree.LICENCIATURA,
        careerId: carreraDerecho.id,
        authorId: estudiante2.id,
        advisorId: docente2.id,
        coAdvisorId: docente1.id,
        status: ThesisStatus.BORRADOR,
      },
    });
    console.log(`✅ Tesis creada: ${thesis2.title.substring(0, 50)}...`);

    // Add comments
    await prisma.comment.create({
      data: {
        thesisId: thesis1.id,
        userId: docente1.id,
        content:
          'Excelente avance en el desarrollo del módulo de predicción. Recomiendo agregar más pruebas unitarias.',
        isPublic: true,
      },
    });
    console.log('✅ Comentario creado');

    console.log('\n✅ Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('- 4 Roles (ADMIN, COORDINADOR, DOCENTE, ESTUDIANTE)');
    console.log('- 12 Módulos del sistema (Dashboard, Usuarios, Permisos, Tesis, etc.)');
    console.log('- 24 Permisos rol-módulo configurados');
    console.log('- 3 Facultades (Ingeniería, Ciencias Empresariales, Educación)');
    console.log('- 12 Carreras (con externalName para match con API UNAMAD)');
    console.log('- 6 Usuarios (1 admin, 2 docentes, 1 coordinador, 2 estudiantes)');
    console.log('- 1 Estudiante con doble carrera (Sistemas + Contabilidad)');
    console.log('- 2 Tesis');
    console.log('- 4 Hitos');
    console.log('- 1 Comentario');
    console.log('\n📋 Permisos por rol:');
    console.log('  ADMIN: Dashboard, Usuarios, Permisos, Facultades, Carreras, Inscripciones, Tesis, Plazos, Reportes');
    console.log('  COORDINADOR: Dashboard, Tesis, Carreras, Inscripciones, Plazos, Reportes, Revisiones');
    console.log('  DOCENTE: Dashboard, Mis Asesorados, Revisiones, Gestión de Tesis (ver)');
    console.log('  ESTUDIANTE: Dashboard, Mis Tesis');
    console.log('\n🔑 Credenciales de prueba:');
    console.log('Email: admin@universidad.edu | Password: password123');
    console.log('Email: coordinador@universidad.edu | Password: password123');
    console.log('Email: docente1@universidad.edu | Password: password123');
    console.log('Email: estudiante.doble@universidad.edu | Password: password123');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seed();
