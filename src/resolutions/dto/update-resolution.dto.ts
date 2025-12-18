import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateResolutionDto } from './create-resolution.dto';

export class UpdateResolutionDto extends PartialType(
  OmitType(CreateResolutionDto, ['thesisId'] as const),
) {}
