import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/create-group.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @ApiOperation({ summary: 'Barcha guruhlar ro\'yxati' })
  @Get()
  findAll(@TenantId() centerId: string, @Query() query: PaginationQueryDto) {
    return this.groupsService.findAll(centerId, query);
  }

  @ApiOperation({ summary: 'Guruhni ID bo\'yicha olish (barcha talabalari, davomati va to\'lovlari bilan)' })
  @Get(':id')
  findOne(@TenantId() centerId: string, @Param('id') id: string) {
    return this.groupsService.findOne(centerId, id);
  }

  @ApiOperation({ summary: 'Yangi guruh ochish' })
  @Post()
  create(@TenantId() centerId: string, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(centerId, dto);
  }

  @ApiOperation({ summary: 'Guruhni tahrirlash' })
  @Patch(':id')
  update(
    @TenantId() centerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(centerId, id, dto);
  }

  @ApiOperation({ summary: 'Guruhni o\'chirish' })
  @Delete(':id')
  remove(@TenantId() centerId: string, @Param('id') id: string) {
    return this.groupsService.remove(centerId, id);
  }
}
