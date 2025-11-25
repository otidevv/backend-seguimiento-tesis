import { PrismaClient, RoleEnum, AcademicDegree } from '@prisma/client';
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

    console.log('\n📝 Creando facultades...');
    // Create faculties
    const facultadIngenieria = await prisma.faculty.create({
      data: {
        name: 'Facultad de Ingeniería',
        code: 'FI',
        description: 'Facultad de Ingeniería y Tecnología',
      },
    });
    console.log(`✅ Facultad creada: ${facultadIngenieria.name}`);

    const facultadCiencias = await prisma.faculty.create({
      data: {
        name: 'Facultad de Ciencias',
        code: 'FC',
        description: 'Facultad de Ciencias Básicas',
      },
    });
    console.log(`✅ Facultad creada: ${facultadCiencias.name}`);

    console.log('\n📝 Creando carreras...');
    // Create careers
    const carreraInformatica = await prisma.career.create({
      data: {
        name: 'Ingeniería de Sistemas',
        code: 'IS',
        description: 'Carrera de Ingeniería de Sistemas y Computación',
        facultyId: facultadIngenieria.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraInformatica.name}`);

    const carreraElectronica = await prisma.career.create({
      data: {
        name: 'Ingeniería Electrónica',
        code: 'IE',
        description: 'Carrera de Ingeniería Electrónica',
        facultyId: facultadIngenieria.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraElectronica.name}`);

    const carreraMatematica = await prisma.career.create({
      data: {
        name: 'Matemática',
        code: 'MAT',
        description: 'Carrera de Matemática',
        facultyId: facultadCiencias.id,
      },
    });
    console.log(`✅ Carrera creada: ${carreraMatematica.name}`);

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

    // Inscribir estudiante en 2 carreras
    await prisma.enrollment.create({
      data: {
        userId: estudianteDobleCarrera.id,
        careerId: carreraInformatica.id,
        studentCode: 'IS2024001',
      },
    });
    console.log('✅ Inscripción: Juan Pérez → Ingeniería de Sistemas');

    await prisma.enrollment.create({
      data: {
        userId: estudianteDobleCarrera.id,
        careerId: carreraElectronica.id,
        studentCode: 'IE2024001',
      },
    });
    console.log('✅ Inscripción: Juan Pérez → Ingeniería Electrónica');

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
        careerId: carreraMatematica.id,
        studentCode: 'MAT2024001',
      },
    });
    console.log('✅ Inscripción: Laura Sánchez → Matemática');

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
        status: 'EN_DESARROLLO',
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
        title: 'Análisis de Convergencia de Series Infinitas en Espacios de Hilbert',
        description:
          'Estudio teórico sobre la convergencia de series infinitas',
        academicDegree: AcademicDegree.LICENCIATURA,
        careerId: carreraMatematica.id,
        authorId: estudiante2.id,
        advisorId: docente2.id,
        coAdvisorId: docente1.id,
        status: 'PROPUESTA',
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
    console.log('- 4 Roles');
    console.log('- 2 Facultades');
    console.log('- 3 Carreras');
    console.log('- 6 Usuarios (1 admin, 2 docentes, 1 coordinador, 2 estudiantes)');
    console.log('- 1 Estudiante con doble carrera');
    console.log('- 2 Tesis');
    console.log('- 4 Hitos');
    console.log('- 1 Comentario');
    console.log('\n🔑 Credenciales de prueba:');
    console.log('Email: admin@universidad.edu | Password: password123');
    console.log('Email: docente1@universidad.edu | Password: password123');
    console.log(
      'Email: estudiante.doble@universidad.edu | Password: password123',
    );

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seed();
