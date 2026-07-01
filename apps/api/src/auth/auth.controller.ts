import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Patch('password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() values: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, values);
  }

  @Post('password/forgot')
  forgotPassword(@Body() values: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(values);
  }

  @Post('password/reset')
  resetPassword(@Body() values: ResetPasswordDto) {
    return this.authService.resetPassword(values);
  }
}
