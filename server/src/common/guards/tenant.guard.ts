import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = ctxToReq(context);
    const user = request.user;
    if (!user || !user.centerId) {
      throw new ForbiddenException('Markazga kirish huquqi yoq');
    }
    return true;
  }
}

function ctxToReq(context: ExecutionContext) {
  return context.switchToHttp().getRequest();
}
