import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Interface para la respuesta de la API externa de estudiantes
interface ExternalStudentInfo {
  username: string;
  dni: string;
  name: string;
  paternalSurname: string;
  maternalSurname: string;
  email: string;
  personalEmail: string | null;
  carrerName: string;
  facultyName: string;
}

interface ExternalStudentData {
  info: ExternalStudentInfo;
  totalCreditsApproved: number;
}

interface ExternalApiResponse {
  status: string;
  data: ExternalStudentData[];
  message: string;
}

// Interface para la respuesta de la API externa de docentes
interface ExternalTeacherData {
  userName: string;
  dni: string;
  name: string;
  paternalSurname: string;
  maternalSurname: string;
  email: string;
  personalEmail: string | null;
  academicDepartament: string;
  facultyName: string;
}

@Injectable()
export class EnrollmentsService {
  private readonly externalApiUrl: string;
  private readonly externalTeacherApiUrl: string;
  private readonly externalApiToken: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.externalApiUrl = this.configService.get<string>(
      'EXTERNAL_API_URL',
      'https://daa-documentos.unamad.edu.pe:8081/api/data/student',
    );
    this.externalTeacherApiUrl = this.configService.get<string>(
      'EXTERNAL_TEACHER_API_URL',
      'https://daa-documentos.unamad.edu.pe:8081/api/data/teacher',
    );
    this.externalApiToken = this.configService.get<string>('EXTERNAL_API_TOKEN', '');
  }

  /**
   * Verifica si un documento corresponde a un docente en la API externa
   * Retorna true si es docente, false si no
   */
  async checkIsTeacherFromExternalApi(documentNumber: string): Promise<boolean> {
    const apiUrl = `${this.externalTeacherApiUrl}/${documentNumber}`;

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.externalApiToken) {
        headers['Authorization'] = `Bearer ${this.externalApiToken}`;
      }

      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      // Si la API devuelve datos válidos, es docente
      if (data && (data.name || data.dni)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Sincroniza los datos de un docente desde la API externa
   * Asocia al docente con su facultad y departamento académico
   */
  async syncTeacherFromExternalApi(userId: string, documentNumber: string) {
    const apiUrl = `${this.externalTeacherApiUrl}/${documentNumber}`;

    let teacherData: ExternalTeacherData;
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.externalApiToken) {
        headers['Authorization'] = `Bearer ${this.externalApiToken}`;
      }

      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        throw new BadRequestException(`Error al consultar API de docentes: ${response.status}`);
      }
      teacherData = await response.json();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`No se pudo conectar con la API de docentes: ${error.message}`);
    }

    if (!teacherData || !teacherData.name) {
      throw new NotFoundException(`No se encontró docente con DNI ${documentNumber}`);
    }

    // Buscar o crear la facultad por externalName
    let faculty = await this.prisma.faculty.findUnique({
      where: { externalName: teacherData.facultyName },
    });

    if (!faculty) {
      faculty = await this.prisma.faculty.create({
        data: {
          name: `Facultad de ${teacherData.facultyName}`,
          code: this.generateCode(teacherData.facultyName),
          externalName: teacherData.facultyName,
        },
      });
    }

    // Actualizar el usuario con los datos del docente
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        facultyId: faculty.id,
        academicDepartment: teacherData.academicDepartament,
        teacherCode: teacherData.userName,
        personalEmail: teacherData.personalEmail,
      },
      include: {
        faculty: true,
        roles: true,
      },
    });

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        documentNumber: updatedUser.documentNumber,
        teacherCode: updatedUser.teacherCode,
        academicDepartment: updatedUser.academicDepartment,
        faculty: updatedUser.faculty,
      },
      message: `Docente sincronizado con facultad ${faculty.name}`,
    };
  }

  /**
   * Verifica si un estudiante tiene inscripciones en la API externa (sin crear nada)
   * Retorna el numero de carreras encontradas
   */
  async checkEnrollmentsFromExternalApi(documentNumber: string): Promise<number> {
    const apiUrl = `${this.externalApiUrl}/${documentNumber}`;

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.externalApiToken) {
        headers['Authorization'] = `Bearer ${this.externalApiToken}`;
      }

      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        return 0;
      }

      const externalData: ExternalApiResponse = await response.json();

      if (externalData.status !== 'success' || !externalData.data?.length) {
        return 0;
      }

      return externalData.data.length;
    } catch {
      return 0;
    }
  }

  /**
   * Sincroniza los datos de un estudiante desde la API externa
   */
  async syncFromExternalApi(documentNumber: string) {
    // Fetch data from external API
    const apiUrl = `${this.externalApiUrl}/${documentNumber}`;

    let externalData: ExternalApiResponse;
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Agregar token de autorizacion si esta configurado
      if (this.externalApiToken) {
        headers['Authorization'] = `Bearer ${this.externalApiToken}`;
      }

      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        throw new BadRequestException(`Error al consultar API externa: ${response.status}`);
      }
      externalData = await response.json();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`No se pudo conectar con la API externa: ${error.message}`);
    }

    if (externalData.status !== 'success' || !externalData.data?.length) {
      throw new NotFoundException(`No se encontró estudiante con DNI ${documentNumber}`);
    }

    // Buscar o crear usuario
    let user = await this.prisma.user.findUnique({
      where: { documentNumber },
      include: { roles: true },
    });

    const firstRecord = externalData.data[0].info;

    if (!user) {
      // Obtener rol ESTUDIANTE
      const estudianteRole = await this.prisma.role.findUnique({
        where: { name: 'ESTUDIANTE' },
      });

      if (!estudianteRole) {
        throw new BadRequestException('No se encontró el rol ESTUDIANTE en el sistema');
      }

      // Crear usuario nuevo
      user = await this.prisma.user.create({
        data: {
          email: firstRecord.email,
          personalEmail: firstRecord.personalEmail,
          password: '', // Sin contraseña inicial, debe registrarse
          firstName: firstRecord.name,
          lastName: `${firstRecord.paternalSurname} ${firstRecord.maternalSurname}`,
          documentNumber: firstRecord.dni,
          isEmailVerified: false,
          roles: {
            connect: { id: estudianteRole.id },
          },
        },
        include: { roles: true },
      });
    }

    // Procesar cada carrera del estudiante
    const enrollments: any[] = [];
    for (const studentData of externalData.data) {
      const { info, totalCreditsApproved } = studentData;

      // Buscar facultad por externalName
      let faculty = await this.prisma.faculty.findUnique({
        where: { externalName: info.facultyName },
      });

      // Si no existe, crearla
      if (!faculty) {
        faculty = await this.prisma.faculty.create({
          data: {
            name: info.facultyName,
            code: this.generateCode(info.facultyName),
            externalName: info.facultyName,
          },
        });
      }

      // Buscar carrera por externalName
      let career = await this.prisma.career.findUnique({
        where: { externalName: info.carrerName },
      });

      // Si no existe, crearla
      if (!career) {
        career = await this.prisma.career.create({
          data: {
            name: info.carrerName,
            code: this.generateCode(info.carrerName),
            externalName: info.carrerName,
            facultyId: faculty.id,
          },
        });
      }

      // Verificar si ya existe el enrollment
      let enrollment = await this.prisma.enrollment.findUnique({
        where: { studentCode: info.username },
      });

      if (enrollment) {
        // Actualizar enrollment existente
        enrollment = await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            creditsApproved: totalCreditsApproved,
            syncedFromExternalApi: true,
            externalApiData: JSON.stringify(studentData),
            lastSyncAt: new Date(),
          },
          include: {
            career: { include: { faculty: true } },
            user: true,
          },
        });
      } else {
        // Crear nuevo enrollment
        enrollment = await this.prisma.enrollment.create({
          data: {
            userId: user.id,
            careerId: career.id,
            studentCode: info.username,
            creditsApproved: totalCreditsApproved,
            syncedFromExternalApi: true,
            externalApiData: JSON.stringify(studentData),
            lastSyncAt: new Date(),
          },
          include: {
            career: { include: { faculty: true } },
            user: true,
          },
        });
      }

      enrollments.push(enrollment);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        documentNumber: user.documentNumber,
      },
      enrollments,
      message: `Se sincronizaron ${enrollments.length} carrera(s) para el estudiante`,
    };
  }

  /**
   * Genera un código a partir de un nombre
   */
  private generateCode(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 10);
  }

  /**
   * Obtiene las inscripciones de un usuario
   */
  async findByUser(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        career: {
          include: { faculty: true },
        },
      },
    });
  }

  /**
   * Obtiene una inscripción por ID
   */
  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: true,
        career: {
          include: { faculty: true },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Inscripción con ID ${id} no encontrada`);
    }

    return enrollment;
  }

  /**
   * Obtiene inscripción por código de estudiante
   */
  async findByStudentCode(studentCode: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentCode },
      include: {
        user: true,
        career: {
          include: { faculty: true },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Inscripción con código ${studentCode} no encontrada`);
    }

    return enrollment;
  }

  /**
   * Lista todas las inscripciones
   */
  async findAll(careerId?: string) {
    return this.prisma.enrollment.findMany({
      where: careerId ? { careerId } : {},
      include: {
        user: true,
        career: {
          include: { faculty: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
