import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsISO8601, IsNumber, IsObject, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { config } from '../utils/config';

export class IniciarDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{30,64}$/) token: string;
}

export class ConsentimientoDto {
  @IsString() @MaxLength(40) version: string;
  @IsString() @Length(20, 4000) texto: string;
  @IsISO8601() otorgado_en: string;
}

export class SubidaDto {
  @IsInt() @Min(1024) @Max(config.captura.maxBytes) bytes: number;
}

class FactorDto {
  @IsOptional() @IsNumber() probabilidad?: number | null;
  @IsOptional() @IsNumber() parecido?: number | null;
  @IsOptional() @IsNumber() distancia?: number | null;
  @IsOptional() @IsString() @MaxLength(60) veredicto?: string | null;
  @IsOptional() @IsIn(['ok', 'warn', 'bad']) nivel?: string | null;
  @IsOptional() prueba_de_vida?: boolean | null;
  @IsOptional() omitida?: boolean;
}

export class ResumenDto {
  @IsString() @MaxLength(60) global: string;
  @IsIn(['ok', 'warn', 'bad']) nivel: 'ok' | 'warn' | 'bad';
  @IsOptional() @ValidateNested() @Type(() => FactorDto) huella?: FactorDto;
  @IsOptional() @ValidateNested() @Type(() => FactorDto) rostro?: FactorDto;
  @IsOptional() @ValidateNested() @Type(() => FactorDto) firma?: FactorDto;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(14, { each: true }) run_leido?: string[];
  @IsOptional() @IsObject() motores?: Record<string, string>;
  @IsOptional() @IsObject() dispositivo?: Record<string, unknown>;
  @IsOptional() @IsInt() duracion_ms?: number;
}

export class ResultadoDto {
  @ValidateNested() @Type(() => ResumenDto) resultado: ResumenDto;
  @IsString() @Matches(/^[a-f0-9]{64}$/) evidencia_sha256: string;
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{64}$/) manifiesto_sha256?: string;
  @IsInt() @Min(1024) @Max(config.captura.maxBytes) bytes_cifrados: number;
}
