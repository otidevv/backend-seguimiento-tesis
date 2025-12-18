import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto, UpdateModuleDto, AssignPermissionsDto } from './dto';
import { PermissionAction, RoleEnum } from '@prisma/client';

@Injectable()
export class SystemModulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo módulo del sistema
   */
  async create(createModuleDto: CreateModuleDto) {
    // Verificar que el nombre no exista
    const existing = await this.prisma.module.findUnique({
      where: { name: createModuleDto.name },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un módulo con el nombre ${createModuleDto.name}`);
    }

    // Verificar módulo padre si se proporciona
    if (createModuleDto.parentId) {
      const parent = await this.prisma.module.findUnique({
        where: { id: createModuleDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Módulo padre no encontrado');
      }
    }

    return this.prisma.module.create({
      data: createModuleDto,
      include: this.getModuleIncludes(),
    });
  }

  /**
   * Lista todos los módulos (árbol jerárquico)
   */
  async findAll(includeInactive: boolean = false) {
    const modules = await this.prisma.module.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { order: 'asc' },
        },
        parent: true,
      },
      orderBy: { order: 'asc' },
    });

    // Construir árbol de módulos (solo raíz)
    return modules.filter((m) => !m.parentId);
  }

  /**
   * Obtiene un módulo por ID
   */
  async findOne(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: this.getModuleIncludes(),
    });

    if (!module) {
      throw new NotFoundException(`Módulo con ID ${id} no encontrado`);
    }

    return module;
  }

  /**
   * Actualiza un módulo
   */
  async update(id: string, updateModuleDto: UpdateModuleDto) {
    await this.findOne(id);

    // Verificar nombre único si se está cambiando
    if (updateModuleDto.name) {
      const existing = await this.prisma.module.findFirst({
        where: {
          name: updateModuleDto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Ya existe un módulo con el nombre ${updateModuleDto.name}`);
      }
    }

    // Verificar módulo padre
    if (updateModuleDto.parentId) {
      if (updateModuleDto.parentId === id) {
        throw new BadRequestException('Un módulo no puede ser su propio padre');
      }

      const parent = await this.prisma.module.findUnique({
        where: { id: updateModuleDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Módulo padre no encontrado');
      }
    }

    return this.prisma.module.update({
      where: { id },
      data: updateModuleDto,
      include: this.getModuleIncludes(),
    });
  }

  /**
   * Elimina un módulo (soft delete)
   */
  async remove(id: string) {
    await this.findOne(id);

    // Verificar si tiene hijos
    const childrenCount = await this.prisma.module.count({
      where: { parentId: id, isActive: true },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar un módulo con submódulos activos',
      );
    }

    return this.prisma.module.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Asigna permisos a un rol
   */
  async assignPermissions(assignPermissionsDto: AssignPermissionsDto) {
    const { roleId, permissions } = assignPermissionsDto;

    // Verificar que el rol existe
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Verificar que los módulos existen
    for (const perm of permissions) {
      const module = await this.prisma.module.findUnique({
        where: { id: perm.moduleId },
      });

      if (!module) {
        throw new NotFoundException(`Módulo ${perm.moduleId} no encontrado`);
      }
    }

    // Eliminar permisos existentes
    await this.prisma.roleModulePermission.deleteMany({
      where: { roleId },
    });

    // Crear nuevos permisos
    await this.prisma.roleModulePermission.createMany({
      data: permissions.map((perm) => ({
        roleId,
        moduleId: perm.moduleId,
        action: perm.action,
      })),
      skipDuplicates: true,
    });

    return this.getRolePermissions(roleId);
  }

  /**
   * Obtiene los permisos de un rol
   */
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role;
  }

  /**
   * Obtiene el menú del usuario actual según sus roles
   */
  async getUserMenu(userId: string) {
    // Obtener roles del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                module: {
                  include: {
                    children: {
                      where: { isActive: true },
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Extraer módulos únicos con permisos
    const modulePermissions = new Map<string, Set<PermissionAction>>();

    for (const role of user.roles) {
      for (const permission of role.permissions) {
        if (!permission.module.isActive) continue;

        const key = permission.moduleId;
        if (!modulePermissions.has(key)) {
          modulePermissions.set(key, new Set());
        }
        modulePermissions.get(key)!.add(permission.action);
      }
    }

    // Obtener módulos raíz accesibles
    const accessibleModuleIds = Array.from(modulePermissions.keys());

    const rootModules = await this.prisma.module.findMany({
      where: {
        isActive: true,
        parentId: null,
        OR: [
          { id: { in: accessibleModuleIds } },
          { children: { some: { id: { in: accessibleModuleIds } } } },
        ],
      },
      include: {
        children: {
          where: {
            isActive: true,
            id: { in: accessibleModuleIds },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Formatear respuesta con permisos
    return rootModules.map((module) => ({
      id: module.id,
      name: module.name,
      displayName: module.displayName,
      description: module.description,
      icon: module.icon,
      route: module.route,
      order: module.order,
      permissions: Array.from(modulePermissions.get(module.id) || []),
      children: module.children.map((child) => ({
        id: child.id,
        name: child.name,
        displayName: child.displayName,
        description: child.description,
        icon: child.icon,
        route: child.route,
        order: child.order,
        permissions: Array.from(modulePermissions.get(child.id) || []),
      })),
    }));
  }

  /**
   * Verifica si un usuario tiene permiso sobre un módulo
   */
  async hasPermission(
    userId: string,
    moduleName: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });

    if (!user) return false;

    for (const role of user.roles) {
      // ADMIN tiene todos los permisos
      if (role.name === RoleEnum.ADMIN) return true;

      for (const permission of role.permissions) {
        if (
          permission.module.name === moduleName &&
          (permission.action === action || permission.action === PermissionAction.MANAGE)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Configuración de includes para las consultas
   */
  private getModuleIncludes() {
    return {
      parent: true,
      children: {
        where: { isActive: true },
        orderBy: { order: 'asc' as const },
      },
      permissions: {
        include: {
          role: true,
        },
      },
    };
  }
}
