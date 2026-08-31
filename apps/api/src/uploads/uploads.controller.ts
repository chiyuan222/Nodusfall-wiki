import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { UploadedFilePayload, UploadsService } from './uploads.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: UploadedFilePayload,
  ) {
    return this.uploadsService.upload(req.user.sub, file).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('presign')
  presign(@Req() req: AuthenticatedRequest, @Body() dto: PresignUploadDto) {
    return this.uploadsService.presign(req.user.sub, dto).then((data) => ({ data }));
  }
}
