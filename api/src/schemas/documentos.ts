import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBase64, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const DEV_HTTP = process.env.ALLOW_HTTP_CALLBACKS === 'true';

// Coordenadas en puntos PDF (1/72"), página desde 1, origen ARRIBA-izquierda de la página.
export class UbicacionDto {
  @IsInt() @Min(1) @Max(2000) pagina: number;
  @IsNumber() @Min(0) @Max(5000) x: number;
  @IsNumber() @Min(0) @Max(5000) y: number;
  @IsOptional() @IsNumber() @Min(90) @Max(600) ancho?: number;
  @IsOptional() @IsNumber() @Min(36) @Max(300) alto?: number;
}

export class FirmanteDto {
  @IsString() @Length(8, 12) rut: string;
  @IsString() @Length(3, 160) nombre: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => UbicacionDto) ubicaciones: UbicacionDto[];
}

export class CrearDocumentoDto {
  @IsString() @Length(1, 200) nombre: string;
  @IsString() @IsBase64() pdf: string;
  @IsOptional() @IsIn(['libre', 'secuencial']) orden?: 'libre' | 'secuencial';
  @IsOptional() @IsString() @MaxLength(120) referencia?: string;
  @IsOptional() @IsUrl({ protocols: DEV_HTTP ? ['http', 'https'] : ['https'], require_protocol: true, require_tld: !DEV_HTTP }) @MaxLength(500) callback_url?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => FirmanteDto) firmantes: FirmanteDto[];
}

export class CancelarDto {
  @IsString() @Length(5, 300) motivo: string;
}
