import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UserRole } from '../database/enums';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { TeacherService } from './teacher.service';

@Controller('teacher')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('dashboard')
  @Roles(UserRole.TEACHER)
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.teacherService.getDashboard(user.id);
  }

  @Patch('enrollments/:id/grade')
  updateGrade(
    @Param('id') enrollmentId: string,
    @Body() values: UpdateGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teacherService.updateGrade(enrollmentId, values, user);
  }
}

