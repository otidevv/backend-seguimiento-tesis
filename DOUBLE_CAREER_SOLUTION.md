# Solución para Estudiantes con Doble Carrera

## Resumen Ejecutivo

**Pregunta:** "Algunos alumnos cursan 2 carreras, ¿tendrán que hacer un registro doble?"

**Respuesta:** **NO.** Un estudiante con doble carrera tiene **un solo usuario/cuenta**, pero está inscrito en **múltiples carreras** simultáneamente a través del modelo `Enrollment`.

## Arquitectura de la Solución

### Flujo de Relaciones

```
Usuario único (User)
    ↓ 1:N
Inscripciones (Enrollment) ← Cada inscripción tiene un código de estudiante único
    ↓ N:1
Carreras (Career)
    ↓ N:1
Facultades (Faculty)
```

### Ejemplo Práctico

**Juan Pérez** - Estudiante con doble carrera:
- **1 cuenta**: `estudiante.doble@universidad.edu` / `password123`
- **2 inscripciones**:
  - Ingeniería de Sistemas → Código: `IS2024001`
  - Ingeniería Electrónica → Código: `IE2024001`
- **2 tesis potenciales**:
  - Tesis 1: "Sistema de ML..." → Carrera: Ingeniería de Sistemas
  - Tesis 2 (futura): "Circuito IoT..." → Carrera: Ingeniería Electrónica

## Modelos Clave en Prisma

### User (Usuario Único)
```prisma
model User {
  id              String         @id @default(uuid())
  email           String         @unique        // ← UN SOLO EMAIL
  password        String                        // ← UNA SOLA CONTRASEÑA
  firstName       String
  lastName        String
  documentNumber  String?        @unique        // ← UN SOLO DNI

  // Un usuario puede tener MÚLTIPLES inscripciones
  enrollments     Enrollment[]

  // Un usuario puede ser autor de MÚLTIPLES tesis
  thesesAsAuthor  Thesis[]       @relation("ThesisAuthor")
}
```

### Enrollment (Inscripción en Carrera)
```prisma
model Enrollment {
  id            String   @id @default(uuid())
  userId        String
  careerId      String
  studentCode   String   // ← CÓDIGO ÚNICO DEL ESTUDIANTE EN ESA CARRERA

  user          User     @relation(fields: [userId], references: [id])
  career        Career   @relation(fields: [careerId], references: [id])

  // ← RESTRICCIÓN: Un usuario solo puede inscribirse UNA VEZ en cada carrera
  @@unique([userId, careerId])
}
```

### Thesis (Tesis Vinculada a Carrera)
```prisma
model Thesis {
  id             String    @id @default(uuid())
  title          String
  careerId       String    // ← LA TESIS PERTENECE A UNA CARRERA ESPECÍFICA
  authorId       String    // ← AUTOR DE LA TESIS (estudiante)
  advisorId      String    // ← ASESOR DE LA TESIS (docente)

  career         Career    @relation(fields: [careerId], references: [id])
  author         User      @relation("ThesisAuthor", fields: [authorId], references: [id])
}
```

## Ventajas de Esta Arquitectura

| Característica | Beneficio |
|---|---|
| **Un solo login** | El estudiante no necesita recordar múltiples credenciales |
| **Datos únicos** | Email, DNI y datos personales no se duplican |
| **Código por carrera** | Cada inscripción tiene su propio código de estudiante |
| **Tesis independientes** | Cada tesis está claramente asociada a una carrera |
| **Escalable** | Fácil agregar más carreras o facultades sin cambios estructurales |
| **Seguro** | Restricción `@@unique` previene inscripciones duplicadas |
| **Trazabilidad** | Fácil rastrear todas las actividades de un estudiante |

## Comparación: ❌ Mal Diseño vs ✅ Buen Diseño

### ❌ Diseño Incorrecto (Registro Doble)
```
juan.perez.sistemas@universidad.edu     → Carrera: Sistemas
juan.perez.electronica@universidad.edu  → Carrera: Electrónica

Problemas:
- Dos cuentas para el mismo estudiante
- Datos duplicados
- Confusión sobre identidad real
- Dificultad para ver historial completo
```

### ✅ Diseño Correcto (Inscripción Múltiple)
```
juan.perez@universidad.edu → Usuario único
    ├── Inscripción 1: Sistemas (código IS2024001)
    └── Inscripción 2: Electrónica (código IE2024001)

Beneficios:
- Una sola identidad
- Datos centralizados
- Fácil gestión
- Historial completo visible
```

## Flujo de Uso Completo

### 1. Registro Inicial
```typescript
POST /auth/register
{
  "email": "juan.perez@universidad.edu",
  "password": "securePassword123",
  "firstName": "Juan",
  "lastName": "Pérez",
  "documentNumber": "44444444"
}

// Resultado: Se crea UN usuario con rol ESTUDIANTE
```

### 2. Inscripción en Primera Carrera (por coordinador/admin)
```typescript
POST /enrollments
{
  "userId": "uuid-de-juan",
  "careerId": "uuid-ingenieria-sistemas",
  "studentCode": "IS2024001"
}

// Resultado: Juan ahora está inscrito en Sistemas
```

### 3. Inscripción en Segunda Carrera (por coordinador/admin)
```typescript
POST /enrollments
{
  "userId": "uuid-de-juan",  // ← MISMO USUARIO
  "careerId": "uuid-ingenieria-electronica",
  "studentCode": "IE2024001"
}

// Resultado: Juan ahora está inscrito en ambas carreras
```

### 4. Creación de Tesis en Primera Carrera
```typescript
POST /theses
{
  "title": "Sistema de ML para inventario",
  "careerId": "uuid-ingenieria-sistemas",  // ← TESIS PARA SISTEMAS
  "authorId": "uuid-de-juan",
  "advisorId": "uuid-docente-1"
}
```

### 5. (Futuro) Creación de Tesis en Segunda Carrera
```typescript
POST /theses
{
  "title": "Circuito IoT para domótica",
  "careerId": "uuid-ingenieria-electronica",  // ← TESIS PARA ELECTRÓNICA
  "authorId": "uuid-de-juan",  // ← MISMO ESTUDIANTE
  "advisorId": "uuid-docente-2"
}
```

## Consultas SQL Útiles

### Ver todas las inscripciones de un estudiante
```sql
SELECT u.firstName, u.lastName, c.name as career, e.studentCode
FROM users u
JOIN enrollments e ON u.id = e.userId
JOIN careers c ON e.careerId = c.id
WHERE u.email = 'juan.perez@universidad.edu';
```

### Ver todas las tesis de un estudiante (en todas sus carreras)
```sql
SELECT t.title, c.name as career, t.status
FROM theses t
JOIN careers c ON t.careerId = c.id
JOIN users u ON t.authorId = u.id
WHERE u.email = 'juan.perez@universidad.edu';
```

## Datos de Prueba (Seed)

El sistema viene con datos de ejemplo que demuestran esta solución:

```javascript
// Usuario con doble carrera
const juan = await prisma.user.create({
  data: {
    email: 'estudiante.doble@universidad.edu',
    firstName: 'Juan',
    lastName: 'Pérez'
  }
});

// Primera inscripción
await prisma.enrollment.create({
  data: {
    userId: juan.id,
    careerId: ingenieriaDeSystemas.id,
    studentCode: 'IS2024001'
  }
});

// Segunda inscripción (MISMO USUARIO)
await prisma.enrollment.create({
  data: {
    userId: juan.id,
    careerId: ingenieriaElectronica.id,
    studentCode: 'IE2024001'
  }
});
```

### Probar la Solución
```bash
# 1. Poblar la base de datos con datos de ejemplo
npm run seed

# 2. Login con estudiante de doble carrera
POST http://localhost:3000/auth/login
{
  "email": "estudiante.doble@universidad.edu",
  "password": "password123"
}

# 3. Ver el perfil (incluye ambas inscripciones)
GET http://localhost:3000/users/{userId}
```

## Configuración de Restricciones

### Restricción de Unicidad
```prisma
@@unique([userId, careerId])
```

Esta línea en el modelo `Enrollment` **previene duplicados**:
- ✅ Juan puede inscribirse en Sistemas
- ✅ Juan puede inscribirse en Electrónica
- ❌ Juan NO puede inscribirse DOS VECES en Sistemas

### Cascada en Eliminación
```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

Si se elimina un usuario:
- Se eliminan automáticamente todas sus inscripciones
- Se eliminan automáticamente todas sus tesis
- Se eliminan automáticamente todos sus comentarios

## Extensiones Futuras

### Dashboard del Estudiante
```javascript
// Mostrar resumen de ambas carreras
GET /students/{userId}/dashboard

Response:
{
  "user": {
    "name": "Juan Pérez",
    "email": "estudiante.doble@universidad.edu"
  },
  "enrollments": [
    {
      "career": "Ingeniería de Sistemas",
      "code": "IS2024001",
      "thesis": {
        "title": "Sistema de ML...",
        "status": "EN_DESARROLLO",
        "progress": 60%
      }
    },
    {
      "career": "Ingeniería Electrónica",
      "code": "IE2024001",
      "thesis": null  // Aún no ha iniciado tesis aquí
    }
  ]
}
```

### Permisos por Carrera
```javascript
// Un coordinador solo puede ver tesis de SU carrera
if (user.role === 'COORDINADOR') {
  const theses = await prisma.thesis.findMany({
    where: {
      career: {
        coordinatorId: user.id
      }
    }
  });
}
```

## Conclusión

✅ **Un estudiante con doble carrera NO necesita registro doble**

La arquitectura implementada es:
- **Eficiente**: Un solo registro de usuario
- **Clara**: Separación mediante modelo Enrollment
- **Flexible**: Soporta N carreras por estudiante
- **Segura**: Restricciones previenen duplicados
- **Escalable**: Fácil de extender

**La clave está en el modelo Enrollment** que actúa como tabla intermedia entre Users y Careers, permitiendo que un usuario tenga múltiples inscripciones sin duplicar su información personal.
