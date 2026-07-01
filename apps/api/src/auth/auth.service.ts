import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/authenticated-user';
import { EmailService } from '../common/email.service';
import { User } from '../database/entities';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(credentials: LoginDto) {
    const identifier = credentials.identifier.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :identifier', { identifier })
      .orWhere('LOWER(user.username) = :identifier', { identifier })
      .getOne();

    if (
      !user ||
      !user.active ||
      !(await compare(credentials.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        role: user.role,
      }),
      user: safeUser,
    };
  }

  async changePassword(user: AuthenticatedUser, values: ChangePasswordDto) {
    const account = await this.usersRepository.findOne({
      where: { id: user.id },
    });

    if (
      !account ||
      !(await compare(values.currentPassword, account.passwordHash))
    ) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    if (await compare(values.newPassword, account.passwordHash)) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    account.passwordHash = await hash(values.newPassword, 10);
    account.resetPasswordTokenHash = null;
    account.resetPasswordExpiresAt = null;
    await this.usersRepository.save(account);

    return { message: 'La contraseña fue actualizada correctamente' };
  }

  async requestPasswordReset(values: ForgotPasswordDto) {
    const identifier = values.identifier.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :identifier', { identifier })
      .orWhere('LOWER(user.username) = :identifier', { identifier })
      .getOne();

    const response: {
      message: string;
      emailDelivered?: boolean;
      resetToken?: string;
      resetUrl?: string;
    } = {
      message:
        'Si la cuenta existe, enviaremos instrucciones para restablecer la contraseña.',
    };

    if (!user?.active) {
      return response;
    }

    const token = randomBytes(32).toString('hex');
    user.resetPasswordTokenHash = this.hashResetToken(token);
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.usersRepository.save(user);

    const resetUrl = `${this.emailService.getFrontendUrl()}/?resetToken=${token}`;
    const delivery = await this.emailService.sendPasswordReset(user, resetUrl);
    response.emailDelivered = delivery.delivered;

    const canExposeResetToken =
      !this.emailService.isConfigured() &&
      (process.env.NODE_ENV !== 'production' ||
        process.env.EXPOSE_RESET_TOKEN === 'true');

    if (canExposeResetToken) {
      response.resetToken = token;
      response.resetUrl = resetUrl;
    }

    return response;
  }

  async resetPassword(values: ResetPasswordDto) {
    const user = await this.usersRepository.findOne({
      where: {
        resetPasswordTokenHash: this.hashResetToken(values.token),
        resetPasswordExpiresAt: MoreThan(new Date()),
        active: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'El enlace de recuperación no es válido o ya expiró',
      );
    }

    user.passwordHash = await hash(values.newPassword, 10);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await this.usersRepository.save(user);

    return { message: 'La contraseña fue restablecida correctamente' };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
