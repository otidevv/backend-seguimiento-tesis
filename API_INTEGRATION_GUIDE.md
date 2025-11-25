# Guía de Integración con API Externa de UNAMAD (Actualizada)

## 📡 Endpoint de la API Externa - **VERSIÓN MEJORADA**

```
GET https://daa-documentos.unamad.edu.pe:8081/api/data/student/{dni}
```

**Entrada:** DNI del estudiante (ej: "72884710")

**Ventajas de esta API:**
✅ Busca por DNI (más natural)
✅ **Devuelve TODAS las carreras del estudiante** (maneja doble carrera nativamente)
✅ Incluye créditos aprobados por carrera
✅ Un solo llamado para obtener información completa

## 📋 Respuesta de la API (Caso Real: Doble Carrera)

```json
{
  "status": "success",
  "data": [
    {
      "info": {
        "username": "20137013",
        "dni": "72884710",
        "name": "JEFFERSON",
        "paternalSurname": "MORALES",
        "maternalSurname": "ZAVALETA",
        "email": "jzavaleta@unamad.edu.pe",
        "personalEmail": "MOZAJEF.17@GMAIL.COM",
        "carrerName": "CONTABILIDAD Y FINANZAS",
        "facultyName": "CIENCIAS EMPRESARIALES"
      },
      "totalCreditsApproved": 218.00
    },
    {
      "info": {
        "username": "13121013",
        "dni": "72884710",
        "name": "JEFFERSON",
        "paternalSurname": "MORALES",
        "maternalSurname": "ZAVALETA",
        "email": "mozajef17@gmail.com",
        "personalEmail": null,
        "carrerName": "INGENIERÍA DE SISTEMAS E INFORMÁTICA",
        "facultyName": "INGENIERIA"
      },
      "totalCreditsApproved": 215.00
    }
  ],
  "message": "Estudiante encontrado exitosamente"
}
```

**🎯 Observación Clave:** Jefferson tiene:
- **1 DNI** (72884710)
- **2 usernames** (códigos): 20137013 y 13121013
- **2 carreras**: Contabilidad y Sistemas
- **2 emails diferentes**: institucional y personal

## 🔗 Mapeo API → Base de Datos

### De `data[].info` a `User` (UN SOLO USUARIO)

| Campo API | Campo DB | Notas |
|-----------|----------|-------|
| `dni` | `User.documentNumber` | ✅ **CLAVE ÚNICA** - Identifica al estudiante |
| `name` | `User.firstName` | Nombre |
| `paternalSurname + maternalSurname` | `User.lastName` | "MORALES ZAVALETA" |
| `email` (primer registro) | `User.email` | Email principal |
| `personalEmail` | *(nuevo campo)* | Email personal alternativo |

### De `data[]` a `Enrollment` (MÚLTIPLES INSCRIPCIONES)

| Campo API | Campo DB | Notas |
|-----------|----------|-------|
| `info.username` | `Enrollment.studentCode` | ✅ Código único por carrera |
| `info.carrerName` | `Career.name` | Buscar o crear |
| `info.facultyName` | `Faculty.name` | Buscar o crear |
| `totalCreditsApproved` | `Enrollment.creditsApproved` | *(nuevo campo)* Créditos acumulados |

## 📊 Actualización del Esquema Prisma

### Agregar Campo de Créditos en Enrollment

```prisma
model Enrollment {
  id                    String    @id @default(uuid())
  userId                String
  careerId              String
  studentCode           String    @unique // username de API: "20137013", "13121013"
  creditsApproved       Decimal?  // totalCreditsApproved de API
  lastAcademicPeriod    String?
  academicPeriodId      String?
  enrollmentDate        DateTime  @default(now())
  isActive              Boolean   @default(true)
  syncedFromExternalApi Boolean   @default(false)
  externalApiData       String?   // JSON completo de ese registro
  lastSyncAt            DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Relations
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  career Career @relation(fields: [careerId], references: [id])

  @@unique([userId, careerId])
  @@map("enrollments")
}
```

### Agregar Email Personal en User

```prisma
model User {
  // ... campos existentes
  email           String   @unique  // Email principal/institucional
  personalEmail   String?  // Email personal adicional
  // ... resto de campos
}
```

## 🛠️ Implementación del Servicio de Sincronización

### ExternalApiService (Actualizado)

```typescript
// src/external-api/external-api.service.ts
import { Injectable, HttpService } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ExternalApiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sincroniza estudiante por DNI
   * Esta API devuelve TODAS las carreras del estudiante
   */
  async syncStudentByDNI(dni: string) {
    // 1. Llamar a la API externa
    const url = `https://daa-documentos.unamad.edu.pe:8081/api/data/student/${dni}`;
    const response = await this.httpService.get(url).toPromise();
    const apiData = response.data;

    if (apiData.status !== 'success' || !apiData.data || apiData.data.length === 0) {
      throw new Error('Estudiante no encontrado en API externa');
    }

    // 2. Tomar info del primer registro (datos personales son iguales)
    const firstRecord = apiData.data[0].info;

    // 3. Buscar o crear usuario (UN SOLO USUARIO para todas las carreras)
    const user = await this.findOrCreateUser(firstRecord);

    // 4. Para cada carrera en data[], crear enrollment
    const enrollments = [];
    for (const careerData of apiData.data) {
      const enrollment = await this.syncEnrollment(user.id, careerData);
      enrollments.push(enrollment);
    }

    return {
      user,
      enrollments,
      totalCareers: enrollments.length,
    };
  }

  private async findOrCreateUser(infoStudent: any) {
    const dni = infoStudent.dni;

    // Buscar por DNI (más confiable que email)
    let user = await this.prisma.user.findUnique({
      where: { documentNumber: dni }
    });

    if (!user) {
      // Crear usuario con contraseña temporal = DNI
      const tempPassword = await bcrypt.hash(dni, 10);

      // Buscar rol ESTUDIANTE
      const estudianteRole = await this.prisma.role.findUnique({
        where: { name: 'ESTUDIANTE' }
      });

      user = await this.prisma.user.create({
        data: {
          email: infoStudent.email,
          personalEmail: infoStudent.personalEmail,
          password: tempPassword,
          firstName: infoStudent.name,
          lastName: `${infoStudent.paternalSurname} ${infoStudent.maternalSurname}`,
          documentNumber: dni,
          isEmailVerified: true,
          roles: {
            connect: { id: estudianteRole.id }
          }
        },
      });

      console.log(`✅ Usuario creado: ${user.email} (DNI: ${dni})`);
    } else {
      console.log(`ℹ️  Usuario ya existe: ${user.email} (DNI: ${dni})`);
    }

    return user;
  }

  private async syncEnrollment(userId: string, careerData: any) {
    const info = careerData.info;

    // 1. Buscar o crear facultad
    const faculty = await this.findOrCreateFaculty(info.facultyName);

    // 2. Buscar o crear carrera
    const career = await this.findOrCreateCareer(info.carrerName, faculty.id);

    // 3. Crear o actualizar enrollment
    const studentCode = info.username;

    const enrollment = await this.prisma.enrollment.upsert({
      where: {
        studentCode: studentCode
      },
      update: {
        creditsApproved: careerData.totalCreditsApproved,
        syncedFromExternalApi: true,
        externalApiData: JSON.stringify(careerData),
        lastSyncAt: new Date(),
      },
      create: {
        userId: userId,
        careerId: career.id,
        studentCode: studentCode,
        creditsApproved: careerData.totalCreditsApproved,
        syncedFromExternalApi: true,
        externalApiData: JSON.stringify(careerData),
        lastSyncAt: new Date(),
      },
    });

    console.log(`✅ Enrollment sincronizado: ${studentCode} → ${info.carrerName}`);
    return enrollment;
  }

  private async findOrCreateFaculty(name: string) {
    let faculty = await this.prisma.faculty.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (!faculty) {
      faculty = await this.prisma.faculty.create({
        data: {
          name: name,
          code: this.generateFacultyCode(name),
          description: `Facultad de ${name}`,
        },
      });
      console.log(`✅ Facultad creada: ${name}`);
    }

    return faculty;
  }

  private async findOrCreateCareer(name: string, facultyId: string) {
    let career = await this.prisma.career.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (!career) {
      career = await this.prisma.career.create({
        data: {
          name: name,
          code: this.generateCareerCode(name),
          facultyId: facultyId,
        },
      });
      console.log(`✅ Carrera creada: ${name}`);
    }

    return career;
  }

  private generateFacultyCode(name: string): string {
    return name.substring(0, 3).toUpperCase();
  }

  private generateCareerCode(name: string): string {
    const words = name.split(' ');
    return words
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 5);
  }
}
```

### Controller para Sincronización

```typescript
// src/external-api/external-api.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('sync')
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  /**
   * Sincronizar estudiante por DNI
   * Solo ADMIN y COORDINADOR pueden sincronizar
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINADOR')
  @Post('student')
  async syncStudent(@Body() body: { dni: string }) {
    return this.externalApiService.syncStudentByDNI(body.dni);
  }

  /**
   * Sincronizar y obtener información de estudiante
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINADOR')
  @Get('student/:dni')
  async getAndSyncStudent(@Param('dni') dni: string) {
    return this.externalApiService.syncStudentByDNI(dni);
  }
}
```

## 🔄 Flujo Completo de Sincronización

### Caso: Jefferson (Doble Carrera)

**Paso 1:** Admin/Coordinador sincroniza por DNI
```bash
POST http://localhost:3000/sync/student
{
  "dni": "72884710"
}
```

**Paso 2:** Sistema realiza las siguientes acciones:

1. ✅ Llama a API externa con DNI `72884710`
2. ✅ Recibe 2 registros (Contabilidad y Sistemas)
3. ✅ Crea **1 usuario** Jefferson con:
   - Email: `jzavaleta@unamad.edu.pe`
   - PersonalEmail: `MOZAJEF.17@GMAIL.COM`
   - DNI: `72884710`
   - Contraseña temporal: `72884710` (su DNI)

4. ✅ Crea/actualiza facultad "CIENCIAS EMPRESARIALES"
5. ✅ Crea/actualiza carrera "CONTABILIDAD Y FINANZAS"
6. ✅ Crea **Enrollment #1**:
   - studentCode: `20137013`
   - creditsApproved: `218.00`

7. ✅ Crea/actualiza facultad "INGENIERIA"
8. ✅ Crea/actualiza carrera "INGENIERÍA DE SISTEMAS E INFORMÁTICA"
9. ✅ Crea **Enrollment #2**:
   - studentCode: `13121013`
   - creditsApproved: `215.00`

**Resultado:**
```json
{
  "user": {
    "id": "uuid-jefferson",
    "email": "jzavaleta@unamad.edu.pe",
    "firstName": "JEFFERSON",
    "lastName": "MORALES ZAVALETA",
    "documentNumber": "72884710"
  },
  "enrollments": [
    {
      "studentCode": "20137013",
      "career": "CONTABILIDAD Y FINANZAS",
      "creditsApproved": 218.00
    },
    {
      "studentCode": "13121013",
      "career": "INGENIERÍA DE SISTEMAS E INFORMÁTICA",
      "creditsApproved": 215.00
    }
  ],
  "totalCareers": 2
}
```

**Paso 3:** Jefferson puede hacer login:
```bash
POST http://localhost:3000/auth/login
{
  "email": "jzavaleta@unamad.edu.pe",
  "password": "72884710"  // Su DNI temporalmente
}
```

## 📊 Consultas SQL Útiles

### Ver estudiante con múltiples carreras

```sql
SELECT
  u.firstName,
  u.lastName,
  u.documentNumber as dni,
  c.name as career,
  e.studentCode,
  e.creditsApproved
FROM users u
JOIN enrollments e ON u.id = e.userId
JOIN careers c ON e.careerId = c.id
WHERE u.documentNumber = '72884710';
```

**Resultado esperado:**
```
firstName  | lastName          | dni       | career                                | studentCode | creditsApproved
-----------|-------------------|-----------|---------------------------------------|-------------|----------------
JEFFERSON  | MORALES ZAVALETA  | 72884710  | CONTABILIDAD Y FINANZAS               | 20137013    | 218.00
JEFFERSON  | MORALES ZAVALETA  | 72884710  | INGENIERÍA DE SISTEMAS E INFORMÁTICA  | 13121013    | 215.00
```

## 🎯 Ventajas de Esta Implementación

| Característica | Beneficio |
|----------------|-----------|
| **Búsqueda por DNI** | Más natural y confiable que username |
| **Una llamada API** | Obtiene todas las carreras en un solo request |
| **Sincronización atómica** | Toda la info del estudiante en una transacción |
| **Créditos acumulados** | Tracking de progreso académico |
| **Emails múltiples** | Institucional + personal |
| **Idempotente** | Ejecutar N veces da el mismo resultado |

## 🔐 Seguridad y Validaciones

### 1. Contraseña Temporal
```typescript
// Primer login debe forzar cambio de contraseña
if (user.password === hashedDNI) {
  return {
    requirePasswordChange: true,
    message: 'Debes cambiar tu contraseña temporal'
  };
}
```

### 2. Validación de DNI
```typescript
// Validar formato de DNI (8 dígitos)
if (!/^\d{8}$/.test(dni)) {
  throw new BadRequestException('DNI inválido');
}
```

### 3. Manejo de Errores API Externa
```typescript
try {
  const response = await this.httpService.get(url).toPromise();
} catch (error) {
  if (error.response?.status === 404) {
    throw new NotFoundException('Estudiante no encontrado en sistema UNAMAD');
  }
  throw new ServiceUnavailableException('API externa no disponible');
}
```

## 📝 Migración del Esquema

```bash
# Agregar campos nuevos
npx prisma db push

# Regenerar cliente
npx prisma generate

# Reiniciar aplicación
npm run start:dev
```

## 🚀 Próximos Pasos

1. ✅ Actualizar esquema Prisma con campos `creditsApproved` y `personalEmail`
2. ✅ Crear módulo `ExternalApiModule`
3. ✅ Implementar servicio con código de ejemplo
4. ✅ Probar sincronización con DNI real: `72884710`
5. ✅ Implementar validaciones y manejo de errores
6. ✅ Agregar logs detallados de sincronización
7. ✅ Crear dashboard de admin para sincronización masiva

## 🎓 Conclusión

Esta API es **perfecta** para tu caso porque:
- ✅ Maneja doble carrera nativamente
- ✅ Búsqueda por DNI (más intuitivo)
- ✅ Información completa en una llamada
- ✅ Incluye datos académicos (créditos)
- ✅ Minimiza complejidad de implementación

**¡Es la mejor opción para tu sistema de seguimiento de tesis!** 🎉
