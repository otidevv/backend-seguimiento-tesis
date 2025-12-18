import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ThesisStatus, DeadlineStatus } from '@prisma/client';

export interface DashboardStats {
  theses: {
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    approved: number;
    inProgress: number;
    pending: number;
  };
  deadlines: {
    upcoming: number;
    expired: number;
    upcomingList: {
      id: string;
      type: string;
      dueDate: Date;
      daysRemaining: number;
      thesis: {
        id: string;
        title: string;
        author: { firstName: string; lastName: string };
      };
    }[];
  };
  users: {
    total: number;
    students: number;
    teachers: number;
    coordinators: number;
  };
  faculties: {
    total: number;
    careers: number;
  };
  recentActivity: {
    id: string;
    type: 'thesis_created' | 'status_changed' | 'review_submitted' | 'document_uploaded';
    description: string;
    createdAt: Date;
    user?: { firstName: string; lastName: string };
  }[];
}

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const [thesisStats, deadlineStats, userStats, facultyStats, recentActivity] =
      await Promise.all([
        this.getThesisStats(),
        this.getDeadlineStats(),
        this.getUserStats(),
        this.getFacultyStats(),
        this.getRecentActivity(),
      ]);

    return {
      theses: thesisStats,
      deadlines: deadlineStats,
      users: userStats,
      faculties: facultyStats,
      recentActivity,
    };
  }

  private async getThesisStats() {
    const total = await this.prisma.thesis.count();

    const byStatusResult = await this.prisma.thesis.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const thisMonth = await this.prisma.thesis.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const statusCounts: Record<string, number> = {};
    byStatusResult.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    const approvedStatuses: ThesisStatus[] = [
      ThesisStatus.APROBADA,
      ThesisStatus.RESOLUCION_EMITIDA,
      ThesisStatus.EN_DESARROLLO,
      ThesisStatus.EN_REVISION_FINAL,
      ThesisStatus.APTA_SUSTENTACION,
      ThesisStatus.SUSTENTADA,
      ThesisStatus.FINALIZADA,
    ];

    const inProgressStatuses: ThesisStatus[] = [
      ThesisStatus.PRESENTADA,
      ThesisStatus.REGISTRADA,
      ThesisStatus.DERIVADA_ESCUELA,
      ThesisStatus.COMISION_ASIGNADA,
      ThesisStatus.EN_EVALUACION,
      ThesisStatus.OBSERVADA,
      ThesisStatus.LEVANTANDO_OBS,
    ];

    const approved = approvedStatuses.reduce(
      (sum, status) => sum + (statusCounts[status] || 0),
      0,
    );
    const inProgress = inProgressStatuses.reduce(
      (sum, status) => sum + (statusCounts[status] || 0),
      0,
    );
    const pending = statusCounts[ThesisStatus.BORRADOR] || 0;

    return {
      total,
      byStatus: statusCounts,
      thisMonth,
      approved,
      inProgress,
      pending,
    };
  }

  private async getDeadlineStats() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await this.prisma.deadline.count({
      where: {
        status: DeadlineStatus.ACTIVO,
        dueDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    });

    const expired = await this.prisma.deadline.count({
      where: {
        status: DeadlineStatus.ACTIVO,
        dueDate: { lt: now },
      },
    });

    const upcomingList = await this.prisma.deadline.findMany({
      where: {
        status: DeadlineStatus.ACTIVO,
        dueDate: { gte: now },
      },
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
            author: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    return {
      upcoming,
      expired,
      upcomingList: upcomingList.map((d) => ({
        id: d.id,
        type: d.type,
        dueDate: d.dueDate,
        daysRemaining: Math.ceil(
          (d.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
        thesis: d.thesis,
      })),
    };
  }

  private async getUserStats() {
    const total = await this.prisma.user.count();

    const usersWithRoles = await this.prisma.user.findMany({
      include: { roles: true },
    });

    let students = 0;
    let teachers = 0;
    let coordinators = 0;

    usersWithRoles.forEach((user) => {
      const roleNames = user.roles.map((r) => r.name);
      if (roleNames.includes('ESTUDIANTE')) students++;
      if (roleNames.includes('DOCENTE')) teachers++;
      if (roleNames.includes('COORDINADOR')) coordinators++;
    });

    return { total, students, teachers, coordinators };
  }

  private async getFacultyStats() {
    const total = await this.prisma.faculty.count();
    const careers = await this.prisma.career.count();
    return { total, careers };
  }

  private async getRecentActivity(): Promise<DashboardStats['recentActivity']> {
    const thesesCreated = await this.prisma.thesis.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const statusChanges = await this.prisma.thesisStatusHistory.findMany({
      select: {
        id: true,
        newStatus: true,
        createdAt: true,
        changedBy: { select: { firstName: true, lastName: true } },
        thesis: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const reviews = await this.prisma.review.findMany({
      select: {
        id: true,
        decision: true,
        createdAt: true,
        juryMember: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        thesis: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const activities: DashboardStats['recentActivity'] = [];

    thesesCreated.forEach((thesis) => {
      activities.push({
        id: thesis.id,
        type: 'thesis_created',
        description: `Nueva tesis: "${thesis.title.substring(0, 50)}..."`,
        createdAt: thesis.createdAt,
        user: thesis.author,
      });
    });

    statusChanges.forEach((change) => {
      activities.push({
        id: change.id,
        type: 'status_changed',
        description: `Estado cambiado a ${change.newStatus}: "${change.thesis.title.substring(0, 40)}..."`,
        createdAt: change.createdAt,
        user: change.changedBy,
      });
    });

    reviews.forEach((review) => {
      activities.push({
        id: review.id,
        type: 'review_submitted',
        description: `Dictamen ${review.decision}: "${review.thesis.title.substring(0, 40)}..."`,
        createdAt: review.createdAt,
        user: review.juryMember.user,
      });
    });

    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);
  }

  async getThesisByStatusChart() {
    const byStatus = await this.prisma.thesis.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return byStatus.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));
  }

  async getThesisByMonthChart() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const theses = await this.prisma.thesis.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    });

    const byMonth: Record<string, number> = {};
    theses.forEach((thesis) => {
      const month = thesis.createdAt.toISOString().substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    return Object.entries(byMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getThesisByCareerChart() {
    const byCareer = await this.prisma.thesis.groupBy({
      by: ['careerId'],
      _count: { careerId: true },
    });

    const careerIds = byCareer.map((item) => item.careerId);
    const careers = await this.prisma.career.findMany({
      where: { id: { in: careerIds } },
      select: { id: true, name: true },
    });

    const careerMap = new Map(careers.map((c) => [c.id, c.name]));

    return byCareer.map((item) => ({
      career: careerMap.get(item.careerId) || 'Desconocida',
      count: item._count.careerId,
    }));
  }
}
