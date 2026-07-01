import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UserRole } from '../database/enums';
import { AdminService } from './admin.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AddOfferingStudentsDto } from './dto/add-offering-students.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('students/search')
  searchStudents(@Query('q') query = '') {
    return this.adminService.searchStudents(query);
  }

  @Get('academic-structure')
  getAcademicStructure() {
    return this.adminService.getAcademicStructure();
  }

  @Post('cohorts')
  createCohort(@Body() values: CreateCohortDto) {
    return this.adminService.createCohort(values);
  }

  @Post('offerings')
  createOffering(@Body() values: CreateCourseOfferingDto) {
    return this.adminService.createOffering(values);
  }

  @Patch('offerings/:id')
  updateOffering(
    @Param('id') offeringId: string,
    @Body() values: UpdateOfferingDto,
  ) {
    return this.adminService.updateOffering(offeringId, values);
  }

  @Post('offerings/:id/students')
  addOfferingStudents(
    @Param('id') offeringId: string,
    @Body() values: AddOfferingStudentsDto,
  ) {
    return this.adminService.addOfferingStudents(offeringId, values);
  }

  @Delete('offerings/:offeringId/students/:enrollmentId')
  removeOfferingStudent(
    @Param('offeringId') offeringId: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.adminService.removeOfferingStudent(offeringId, enrollmentId);
  }

  @Patch('enrollments/:id')
  updateEnrollment(
    @Param('id') enrollmentId: string,
    @Body() changes: UpdateEnrollmentDto,
  ) {
    return this.adminService.updateEnrollment(enrollmentId, changes);
  }

  @Post('users')
  createUser(@Body() values: CreateUserDto) {
    return this.adminService.createUser(values);
  }

  @Get('users')
  listUsers(
    @Query('q') query = '',
    @Query('role') role?: UserRole.STUDENT | UserRole.TEACHER,
  ) {
    return this.adminService.listUsers(query, role);
  }

  @Get('users/:id/transcript')
  getStudentTranscript(@Param('id') userId: string) {
    return this.adminService.getStudentTranscript(userId);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') userId: string,
    @Body() changes: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.adminService.updateUser(userId, changes, currentUser);
  }

  @Patch('users/:id/payment')
  updateStudentPayment(
    @Param('id') userId: string,
    @Body() changes: UpdateStudentPaymentDto,
  ) {
    return this.adminService.updateStudentPayment(userId, changes);
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.adminService.deleteUser(userId, currentUser);
  }

  @Patch('payments/:id')
  updatePayment(
    @Param('id') paymentId: string,
    @Body() changes: UpdatePaymentDto,
  ) {
    return this.adminService.updatePayment(paymentId, changes);
  }
}
