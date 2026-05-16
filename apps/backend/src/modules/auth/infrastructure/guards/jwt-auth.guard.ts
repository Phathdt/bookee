import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Bearer-token authentication. Apply with @UseGuards(JwtAuthGuard). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
