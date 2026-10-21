import {
  WebSocketGateway, type OnGatewayConnection, type OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { AlertTabService } from './alert-tab.service.js';

@WebSocketGateway({
  namespace: '/alert-tab',
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: true },
})
export class AlertTabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AlertTabService) private readonly alertTab: AlertTabService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') {
      socket.disconnect(true);
      return;
    }
    const principal = await this.auth.authenticateAccessToken(token);
    if (!principal || !(await this.alertTab.isHeldBy(principal.sessionId))) {
      socket.disconnect(true);
      return;
    }
    socket.data.sessionId = principal.sessionId;
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const sessionId = socket.data.sessionId;
    if (typeof sessionId === 'string') await this.alertTab.releaseSession(sessionId);
  }
}
