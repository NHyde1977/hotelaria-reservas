
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const chaveConfigurada = process.env.INTERNAL_API_KEY;

    if (!chaveConfigurada) {
      throw new UnauthorizedException(
        'Chave de serviço não configurada.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const chaveRecebida = request.header('x-internal-api-key');

    if (!chaveRecebida) {
      throw new UnauthorizedException(
        'Chave de serviço não informada.',
      );
    }

    const esperada = Buffer.from(chaveConfigurada);
    const recebida = Buffer.from(chaveRecebida);

    if (
      esperada.length !== recebida.length ||
      !timingSafeEqual(esperada, recebida)
    ) {
      throw new UnauthorizedException(
        'Chave de serviço inválida.',
      );
    }

    return true;
  }
}
