import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CentersService } from './centers.service';
import { UpdateCenterDto, ChangePasswordDto } from './dto/update-center.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('Centers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('centers')
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @ApiOperation({ summary: 'Markaz profilini ko\'rish' })
  @Get('profile')
  getProfile(@TenantId() centerId: string) {
    return this.centersService.getProfile(centerId);
  }

  @ApiOperation({ summary: 'Markaz profilini tahrirlash' })
  @Patch('profile')
  updateProfile(@TenantId() centerId: string, @Body() dto: UpdateCenterDto) {
    return this.centersService.updateProfile(centerId, dto);
  }

  @ApiOperation({ summary: 'Parolni o\'zgartirish' })
  @Patch('change-password')
  changePassword(
    @TenantId() centerId: string,
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.centersService.changePassword(centerId, user.id, dto);
  }
}
