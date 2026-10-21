import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@alertasc/domain';

export const REQUIRED_PERMISSION = 'alertasc:required-permission';
export const RequirePermission = (permission: Permission) => SetMetadata(REQUIRED_PERMISSION, permission);
