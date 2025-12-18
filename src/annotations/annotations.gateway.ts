import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { CreateAnnotationDto, UpdateAnnotationDto } from './dto/create-annotation.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface ConnectedUser {
  odId: string,
  odName: string,
  odColor: string,
  odRole: string,
}

interface DocumentRoom {
  documentId: string;
  users: Map<string, ConnectedUser>;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/annotations',
})
export class AnnotationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('AnnotationsGateway');
  private documentRooms = new Map<string, DocumentRoom>();
  private socketToUser = new Map<string, { odId: string, odName: string, odDocumentId: string }>();

  constructor(
    private annotationsService: AnnotationsService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
      this.logger.log(`Client connected: ${client.id} - User: ${user.firstName} ${user.lastName}`);
    } catch {
      this.logger.warn(`Client ${client.id} connection rejected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userData = this.socketToUser.get(client.id);
    if (userData) {
      const room = this.documentRooms.get(userData.odDocumentId);
      if (room) {
        room.users.delete(userData.odId);
        this.server.to(userData.odDocumentId).emit('user_left', {
          userId: userData.odId,
          connectedUsers: Array.from(room.users.values()),
        });
        if (room.users.size === 0) {
          this.documentRooms.delete(userData.odDocumentId);
        }
      }
      this.socketToUser.delete(client.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_document')
  async handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; thesisId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    // Get jury member info for color
    const juryMember = await this.prisma.juryMember.findFirst({
      where: { thesisId: data.thesisId, userId: user.id, isActive: true },
    });

    const colorMap: Record<string, string> = {
      PRESIDENTE: '#3B82F6', // Blue
      SECRETARIO: '#10B981', // Green
      VOCAL: '#F59E0B', // Orange
      ACCESITARIO: '#8B5CF6', // Purple
    };

    const userColor = juryMember ? colorMap[juryMember.role] || '#6B7280' : '#6B7280';
    const userRole = juryMember?.role || 'VIEWER';

    // Leave previous room if any
    const prevData = this.socketToUser.get(client.id);
    if (prevData) {
      await client.leave(prevData.odDocumentId);
      const prevRoom = this.documentRooms.get(prevData.odDocumentId);
      if (prevRoom) {
        prevRoom.users.delete(prevData.odId);
      }
    }

    // Join new room
    await client.join(data.documentId);

    // Initialize room if needed
    if (!this.documentRooms.has(data.documentId)) {
      this.documentRooms.set(data.documentId, {
        documentId: data.documentId,
        users: new Map(),
      });
    }

    const room = this.documentRooms.get(data.documentId)!;
    const connectedUser: ConnectedUser = {
      odId: user.id,
      odName: `${user.firstName} ${user.lastName}`,
      odColor: userColor,
      odRole: userRole,
    };
    room.users.set(user.id, connectedUser);

    this.socketToUser.set(client.id, {
      odId: user.id,
      odName: connectedUser.odName,
      odDocumentId: data.documentId,
    });

    // Notify others
    client.to(data.documentId).emit('user_joined', {
      user: connectedUser,
      connectedUsers: Array.from(room.users.values()),
    });

    // Send current state to joining user
    const annotations = await this.annotationsService.findByDocument(data.documentId);
    client.emit('initial_state', {
      annotations,
      connectedUsers: Array.from(room.users.values()),
    });

    this.logger.log(`User ${user.id} joined document ${data.documentId}`);
  }

  @SubscribeMessage('leave_document')
  async handleLeaveDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    await client.leave(data.documentId);

    const room = this.documentRooms.get(data.documentId);
    if (room) {
      room.users.delete(user.id);
      this.server.to(data.documentId).emit('user_left', {
        userId: user.id,
        connectedUsers: Array.from(room.users.values()),
      });
    }

    this.socketToUser.delete(client.id);
  }

  @SubscribeMessage('create_annotation')
  async handleCreateAnnotation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateAnnotationDto,
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      const annotation = await this.annotationsService.create(data, user.id);
      this.server.to(data.documentId).emit('annotation_created', annotation);
      return { success: true, annotation };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('update_annotation')
  async handleUpdateAnnotation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { annotationId: string; updates: UpdateAnnotationDto; documentId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      const annotation = await this.annotationsService.update(
        data.annotationId,
        data.updates,
        user.id,
      );
      this.server.to(data.documentId).emit('annotation_updated', annotation);
      return { success: true, annotation };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('delete_annotation')
  async handleDeleteAnnotation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { annotationId: string; documentId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      await this.annotationsService.delete(data.annotationId, user.id);
      this.server.to(data.documentId).emit('annotation_deleted', {
        annotationId: data.annotationId,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('resolve_annotation')
  async handleResolveAnnotation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { annotationId: string; documentId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      const annotation = await this.annotationsService.resolve(
        data.annotationId,
        user.id,
      );
      this.server.to(data.documentId).emit('annotation_updated', annotation);
      return { success: true, annotation };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('create_reply')
  async handleCreateReply(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateReplyDto & { documentId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      const reply = await this.annotationsService.createReply(
        { annotationId: data.annotationId, content: data.content },
        user.id,
      );
      this.server.to(data.documentId).emit('reply_created', {
        annotationId: data.annotationId,
        reply,
      });
      return { success: true, reply };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('cursor_move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; pageNumber: number; x: number; y: number },
  ) {
    const user = client.data.user;
    if (!user) return;

    client.to(data.documentId).emit('cursor_moved', {
      odId: user.id,
      pageNumber: data.pageNumber,
      x: data.x,
      y: data.y,
    });
  }
}
