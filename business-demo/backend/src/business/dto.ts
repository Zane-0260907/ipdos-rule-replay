import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

export class LoginDto { @IsIn(['manager', 'viewer']) role!: 'manager' | 'viewer'; }
export class QuantityDto {
  @IsString() @Length(1, 40) sku!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000) quantity!: number;
}
export class PreviewDto {
  @IsOptional() @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => QuantityDto) changes?: QuantityDto[];
}
export class ReviewDto { @IsString() @Length(64, 64) contentHash!: string; @IsBoolean() acknowledged!: boolean; }
export class ConfirmDto {
  @IsString() @Length(1, 80) planId!: string;
  @IsString() @Length(1, 80) reviewId!: string;
  @IsString() @Length(64, 64) contentHash!: string;
}
export class InventoryChangeDto {
  @IsString() @Length(1, 40) sku!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(-1000) @Max(1000) delta!: number;
  @IsInt() @Min(1) expectedRevision!: number;
}
