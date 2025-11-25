import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, RoleEnum } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Get roles if provided or assign default user role
    let roleIds: string[] = [];
    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      roleIds = createUserDto.roleIds;
    } else {
      // Assign default 'ESTUDIANTE' role
      const estudianteRole = await this.prisma.role.findUnique({
        where: { name: RoleEnum.ESTUDIANTE },
      });
      if (estudianteRole) {
        roleIds = [estudianteRole.id];
      }
    }

    // Create user with roles
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        roles: {
          connect: roleIds.map((id) => ({ id })),
        },
      },
      include: {
        roles: true,
      },
    });

    return user;
  }

  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      include: {
        roles: true,
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
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
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password if being updated
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Prepare update data
    const updateData: any = {
      ...(updateUserDto.email && { email: updateUserDto.email }),
      ...(updateUserDto.password && { password: updateUserDto.password }),
      ...(updateUserDto.firstName && { firstName: updateUserDto.firstName }),
      ...(updateUserDto.lastName && { lastName: updateUserDto.lastName }),
      ...(updateUserDto.isActive !== undefined && {
        isActive: updateUserDto.isActive,
      }),
      ...(updateUserDto.isEmailVerified !== undefined && {
        isEmailVerified: updateUserDto.isEmailVerified,
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
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Check if user exists
    await this.prisma.user.delete({
      where: { id },
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
      throw new NotFoundException('Invalid verification token');
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
