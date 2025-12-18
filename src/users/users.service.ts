import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, RoleEnum } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Check if document number already exists
    if (createUserDto.documentNumber) {
      const existingDocument = await this.prisma.user.findUnique({
        where: { documentNumber: createUserDto.documentNumber },
      });

      if (existingDocument) {
        throw new ConflictException('El número de documento ya está registrado');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Get roles if provided or determine based on external APIs
    let roleIds: string[] = [];
    let enrollmentsCount = 0;
    let shouldSyncEnrollments = false;
    let isTeacher = false;

    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      // Si se proporcionan roles explicitamente (ej: admin creando usuario), usarlos
      roleIds = createUserDto.roleIds;
      // Verificar si alguno de los roles es ESTUDIANTE para sincronizar despues
      const roles = await this.prisma.role.findMany({
        where: { id: { in: roleIds } },
      });
      shouldSyncEnrollments = roles.some((r) => r.name === RoleEnum.ESTUDIANTE);
    } else {
      // Auto-registro: determinar rol basado en APIs externas
      if (createUserDto.documentNumber) {
        // 1. PRIMERO verificar si es docente en la API de docentes
        try {
          this.logger.log(`Verificando si DNI ${createUserDto.documentNumber} es docente...`);
          isTeacher = await this.enrollmentsService.checkIsTeacherFromExternalApi(createUserDto.documentNumber);
          this.logger.log(`Resultado verificación docente: ${isTeacher}`);
        } catch (error) {
          this.logger.warn(`No se pudo verificar docente: ${error.message}`);
          isTeacher = false;
        }

        // 2. Si NO es docente, verificar si tiene inscripciones como estudiante
        if (!isTeacher) {
          try {
            this.logger.log(`Verificando inscripciones para DNI ${createUserDto.documentNumber}`);
            enrollmentsCount = await this.enrollmentsService.checkEnrollmentsFromExternalApi(createUserDto.documentNumber);
            this.logger.log(`Encontradas ${enrollmentsCount} inscripciones`);
          } catch (error) {
            this.logger.warn(`No se pudieron verificar inscripciones: ${error.message}`);
            enrollmentsCount = 0;
          }
        }
      }

      // Asignar rol según verificaciones:
      // - Si está en API de docentes → DOCENTE
      // - Si tiene inscripciones de estudiante → ESTUDIANTE
      // - Si no está en ninguna API → ESTUDIANTE (por defecto)
      let roleName: RoleEnum;
      if (isTeacher) {
        roleName = RoleEnum.DOCENTE;
      } else if (enrollmentsCount > 0) {
        roleName = RoleEnum.ESTUDIANTE;
      } else {
        roleName = RoleEnum.ESTUDIANTE; // Rol por defecto
      }

      const role = await this.prisma.role.findUnique({
        where: { name: roleName },
      });

      if (role) {
        roleIds = [role.id];
        this.logger.log(`Asignando rol ${roleName} al usuario`);
      }

      // Si es estudiante con inscripciones, sincronizar despues de crear el usuario
      shouldSyncEnrollments = !isTeacher && enrollmentsCount > 0;
    }

    // Create user with roles
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        personalEmail: createUserDto.personalEmail,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        documentNumber: createUserDto.documentNumber,
        phone: createUserDto.phone,
        facultyId: createUserDto.facultyId,
        roles: {
          connect: roleIds.map((id) => ({ id })),
        },
      },
      include: {
        roles: true,
        faculty: true,
      },
    });

    // Sincronizar datos según el tipo de usuario
    if (isTeacher && user.documentNumber) {
      // Sincronizar datos del docente (facultad, departamento)
      try {
        this.logger.log(`Sincronizando datos de docente para ${user.documentNumber}`);
        const syncResult = await this.enrollmentsService.syncTeacherFromExternalApi(user.id, user.documentNumber);
        this.logger.log(`Docente sincronizado: ${syncResult.message}`);
      } catch (error) {
        this.logger.warn(`No se pudieron sincronizar datos del docente ${user.documentNumber}: ${error.message}`);
      }
    } else if (shouldSyncEnrollments && user.documentNumber) {
      // Sincronizar inscripciones si es estudiante con DNI
      try {
        this.logger.log(`Sincronizando inscripciones para estudiante ${user.documentNumber}`);
        const syncResult = await this.enrollmentsService.syncFromExternalApi(user.documentNumber);
        this.logger.log(`Sincronizadas ${syncResult.enrollments.length} inscripciones para ${user.email}`);
      } catch (error) {
        this.logger.warn(`No se pudieron sincronizar inscripciones para ${user.documentNumber}: ${error.message}`);
      }
    }

    // Generar token de verificacion y enviar correo
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await this.setEmailVerificationToken(user.id, verificationToken);
      await this.mailService.sendEmailVerification(user.email, verificationToken);
      this.logger.log(`Correo de verificacion enviado a ${user.email}`);
    } catch (error) {
      this.logger.warn(`No se pudo enviar correo de verificacion a ${user.email}: ${error.message}`);
    }

    return user;
  }

  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      include: {
        roles: true,
        faculty: true,
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
        faculty: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
        faculty: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if email is being updated and already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }
    }

    // Check if document number is being updated and already exists
    if (updateUserDto.documentNumber && updateUserDto.documentNumber !== user.documentNumber) {
      const existingDocument = await this.prisma.user.findUnique({
        where: { documentNumber: updateUserDto.documentNumber },
      });

      if (existingDocument) {
        throw new ConflictException('El número de documento ya está registrado');
      }
    }

    // Hash password if being updated
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Prepare update data
    const updateData: any = {
      ...(updateUserDto.email && { email: updateUserDto.email }),
      ...(updateUserDto.personalEmail !== undefined && { personalEmail: updateUserDto.personalEmail }),
      ...(updateUserDto.password && { password: updateUserDto.password }),
      ...(updateUserDto.firstName && { firstName: updateUserDto.firstName }),
      ...(updateUserDto.lastName && { lastName: updateUserDto.lastName }),
      ...(updateUserDto.documentNumber !== undefined && { documentNumber: updateUserDto.documentNumber }),
      ...(updateUserDto.phone !== undefined && { phone: updateUserDto.phone }),
      ...(updateUserDto.isActive !== undefined && {
        isActive: updateUserDto.isActive,
      }),
      ...(updateUserDto.isEmailVerified !== undefined && {
        isEmailVerified: updateUserDto.isEmailVerified,
      }),
      ...(updateUserDto.facultyId !== undefined && {
        facultyId: updateUserDto.facultyId,
      }),
    };

    // Update roles if provided
    if (updateUserDto.roleIds) {
      updateData.roles = {
        set: updateUserDto.roleIds.map((id) => ({ id })),
      };
    }

    // Update user
    return await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: true,
        faculty: true,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Check if user exists
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findAllRoles() {
    return await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async setEmailVerificationToken(
    userId: string,
    token: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token },
    });
  }

  async verifyEmail(token: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('El enlace de verificacion es invalido o ya fue utilizado. Si ya verificaste tu correo, puedes iniciar sesion normalmente.');
    }

    return await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });
  }

  async setPasswordResetToken(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid reset token');
    }

    if (
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new ConflictException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }
}
